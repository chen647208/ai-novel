/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * OpenAI Responses 适配器（provider=openai-responses）。
 * 面向推理模型的新接口 POST {base}/v1/responses。
 *
 * 协议要点（对照官方文档）：
 *  - 系统提示走顶层 instructions，用户输入走 input；
 *  - 最大输出用 max_output_tokens（非 max_tokens）；
 *  - 推理模型不接受 temperature，故一律不下发；
 *  - 响应正文在 output[].content[] 中 type==='output_text' 的 text；
 *  - 流式为 SSE，事件 response.output_text.delta 携带增量，response.completed 收尾并带 usage。
 */
import { aiT } from '../i18n.js';
import type { ModelConfig, AIResponse, StreamingAIResponse } from '../../../shared/types.js';
import { cleanModelOutput, extractResponsesTokenUsage, isAbortError, readErrorResponse } from '../messages.js';
import { createSSEParser } from '../sse.js';
import { AIRequestError, type CallOptions, type ProviderAdapter } from '../types.js';
import { parseRetryAfter, requestErrorFromResponse, withRetry } from '../retry.js';

interface ResponsesContentPart {
  type?: string;
  text?: string;
}
interface ResponsesOutputItem {
  type?: string;
  content?: ResponsesContentPart[];
}
interface ResponsesResponse {
  model?: string;
  status?: string;
  output?: ResponsesOutputItem[];
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}
interface ResponsesStreamEvent {
  type?: string;
  delta?: string;
  response?: ResponsesResponse;
  error?: { message?: string };
  message?: string;
}

/** 规范化 Responses 端点：兼容含/不含 /v1 的 base，去尾斜杠。 */
export function responsesUrl(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  if (base.endsWith('/responses')) return base;
  if (base.endsWith('/v1')) return `${base}/responses`;
  return `${base}/v1/responses`;
}

function responsesBody(model: ModelConfig, prompt: string, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: model.modelName,
    input: prompt,
    stream,
  };
  const system = model.systemPrompt?.trim();
  if (system) body.instructions = system;
  if (model.maxTokens !== undefined) body.max_output_tokens = model.maxTokens;
  // 推理模型不接受 temperature，故不下发
  return body;
}

function responsesText(data: ResponsesResponse): string {
  let text = '';
  for (const item of data.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === 'output_text' && typeof part.text === 'string') text += part.text;
    }
  }
  return text;
}

async function postResponses(
  url: string,
  model: ModelConfig,
  prompt: string,
  stream: boolean,
  options?: CallOptions,
): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    signal: options?.signal,
    headers: {
      'content-type': 'application/json',
      ...(model.apiKey ? { Authorization: `Bearer ${model.apiKey}` } : {}),
      ...(stream ? { accept: 'text/event-stream' } : {}),
    },
    body: JSON.stringify(responsesBody(model, prompt, stream)),
  });

  if (!res.ok) {
    const message = await readErrorResponse(res);
    const err = requestErrorFromResponse(res.status, res.statusText, message);
    throw new AIRequestError(err.message, err.status, err.retryable, parseRetryAfter(res.headers.get('retry-after')));
  }
  return res;
}

export const openAIResponsesAdapter: ProviderAdapter = {
  supportsStreaming(model: ModelConfig): boolean {
    return model.supportsStreaming !== false;
  },

  async complete(model: ModelConfig, prompt: string, options?: CallOptions): Promise<AIResponse> {
    if (!model.apiKey) {
      return { content: '', error: aiT('apiKeyMissing', { provider: 'OpenAI' }) };
    }
    if (!model.endpoint?.trim()) {
      return { content: '', error: aiT('endpointMissingGeneric') };
    }
    const url = responsesUrl(model.endpoint);
    try {
      const data = await withRetry(
        async () => {
          const res = await postResponses(url, model, prompt, false, options);
          return (await res.json()) as ResponsesResponse;
        },
        { retries: options?.retries ?? 2, signal: options?.signal },
      );
      return {
        content: cleanModelOutput(responsesText(data)),
        tokens: extractResponsesTokenUsage(data),
        model: data.model ?? model.modelName,
        finishReason: data.status ?? undefined,
        metadata: { prompt, modelConfig: model },
      };
    } catch (error) {
      if (isAbortError(error)) {
        return { content: '', error: aiT('streamCancelled'), metadata: { prompt, modelConfig: model } };
      }
      return {
        content: '',
        error: aiT('requestFailed', { provider: 'Responses', message: error instanceof Error ? error.message : String(error) }),
        metadata: { prompt, modelConfig: model },
      };
    }
  },

  async stream(
    model: ModelConfig,
    prompt: string,
    onChunk: (response: StreamingAIResponse) => void,
    options?: CallOptions,
  ): Promise<void> {
    if (!model.apiKey) {
      onChunk({ content: '', error: aiT('apiKeyMissing', { provider: 'OpenAI' }), isComplete: true });
      return;
    }
    if (!model.endpoint?.trim()) {
      onChunk({ content: '', error: aiT('endpointMissingGeneric'), isComplete: true });
      return;
    }
    if (model.supportsStreaming === false) {
      const response = await this.complete(model, prompt, options);
      onChunk({ ...response, isComplete: true, isStreaming: false });
      return;
    }

    const url = responsesUrl(model.endpoint);
    let accumulated = '';
    let modelName = model.modelName;
    let finishReason: string | undefined;
    let tokens: AIResponse['tokens'];
    let streamError: string | undefined;

    try {
      const res = await withRetry(
        async () => postResponses(url, model, prompt, true, options),
        { retries: options?.retries ?? 2, signal: options?.signal },
      );

      const reader = res.body?.getReader();
      if (!reader) throw new Error(aiT('streamReadFailed'));

      const decoder = new TextDecoder();
      let done = false;

      const parser = createSSEParser((payload) => {
        if (payload === '[DONE]') return;
        let parsed: ResponsesStreamEvent;
        try {
          parsed = JSON.parse(payload) as ResponsesStreamEvent;
        } catch {
          return; // 忽略无法解析的事件
        }
        switch (parsed.type) {
          case 'response.output_text.delta':
            if (typeof parsed.delta === 'string' && parsed.delta) {
              accumulated += parsed.delta;
              onChunk({
                content: accumulated,
                model: modelName,
                tokens,
                isComplete: false,
                isStreaming: true,
              });
            }
            break;
          case 'response.completed': {
            const final = parsed.response;
            if (final) {
              if (final.model) modelName = final.model;
              const usage = extractResponsesTokenUsage(final);
              if (usage) tokens = usage;
              finishReason = final.status ?? finishReason;
            }
            done = true;
            break;
          }
          case 'response.failed':
          case 'response.incomplete':
            finishReason = parsed.response?.status ?? parsed.type;
            break;
          case 'error':
            streamError = parsed.error?.message ?? parsed.message ?? aiT('streamError', { provider: 'Responses' });
            break;
          default:
            break;
        }
      });

      try {
        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone || done) break;
          if (value) parser.push(decoder.decode(value, { stream: true }));
        }
        parser.push(decoder.decode());
        parser.flush();
      } finally {
        reader.releaseLock();
      }

      if (streamError) {
        onChunk({
          content: accumulated,
          error: streamError,
          isComplete: true,
          isStreaming: false,
        });
        return;
      }

      onChunk({
        content: cleanModelOutput(accumulated),
        model: modelName,
        finishReason,
        tokens,
        isComplete: true,
        isStreaming: false,
        metadata: { prompt, modelConfig: model },
      });
    } catch (error) {
      onChunk({
        content: accumulated,
        error: isAbortError(error) ? aiT('streamCancelled') : aiT('streamException', { provider: 'Responses', message: error instanceof Error ? error.message : String(error) }),
        isComplete: true,
        isStreaming: false,
      });
    }
  },
};
