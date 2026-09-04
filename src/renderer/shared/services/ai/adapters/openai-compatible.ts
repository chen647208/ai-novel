/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * OpenAI Chat Completions 兼容适配器。
 * 覆盖三类上游：provider=openai-chat、provider=ollama、
 * 以及使用 /v1beta/openai/ 兼容端点的 Gemini 配置。
 */
import { i18n } from '@/i18n';
import type { ModelConfig, AIResponse, StreamingAIResponse } from '../../../../../shared/types';
import { buildMessages, cleanModelOutput, extractOpenAITokenUsage, isAbortError, openAIChatUrl, readErrorResponse } from '../messages.js';
import { createSSEParser } from '../sse.js';
import { AIRequestError, DEFAULT_TEMPERATURE, type CallOptions, type ProviderAdapter } from '../types.js';
import { parseRetryAfter, requestErrorFromResponse, withRetry } from '../retry.js';

interface OpenAIChoice {
  message?: { content?: string };
  delta?: { content?: string };
  finish_reason?: string | null;
}

interface OpenAIChunk {
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  choices?: OpenAIChoice[];
  error?: { message?: string };
}

function temperatureOf(model: ModelConfig): number {
  return model.temperature ?? DEFAULT_TEMPERATURE;
}

async function postChat(
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
      'Content-Type': 'application/json',
      ...(model.apiKey ? { Authorization: `Bearer ${model.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: model.modelName,
      messages: buildMessages(model, prompt),
      temperature: temperatureOf(model),
      max_tokens: model.maxTokens,
      stream,
    }),
  });

  if (!res.ok) {
    const message = await readErrorResponse(res);
    const err = requestErrorFromResponse(res.status, res.statusText, message);
    const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
    throw new AIRequestError(err.message, err.status, err.retryable, retryAfter);
  }
  return res;
}

export const openAICompatibleAdapter: ProviderAdapter = {
  supportsStreaming(): boolean {
    return true;
  },

  async complete(model: ModelConfig, prompt: string, options?: CallOptions): Promise<AIResponse> {
    const url = openAIChatUrl(model.endpoint ?? (model.provider === 'ollama' ? 'http://localhost:11434/v1' : ''));
    try {
      const data = await withRetry(
        async () => {
          const res = await postChat(url, model, prompt, false, options);
          return (await res.json()) as OpenAIChunk;
        },
        { retries: options?.retries ?? 2, signal: options?.signal },
      );

      return {
        content: cleanModelOutput(data.choices?.[0]?.message?.content ?? ''),
        tokens: extractOpenAITokenUsage(data),
        model: data.model ?? model.modelName,
        finishReason: data.choices?.[0]?.finish_reason ?? undefined,
        metadata: { prompt, modelConfig: model },
      };
    } catch (error) {
      if (isAbortError(error)) {
        return { content: '', error: '请求已取消', metadata: { prompt, modelConfig: model } };
      }
      return {
        content: '',
        error: error instanceof Error ? i18n.t('errors:requestFailedGeneric', { message: error.message }) : i18n.t('errors:requestFailedUnknown'),
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
    const url = openAIChatUrl(model.endpoint ?? (model.provider === 'ollama' ? 'http://localhost:11434/v1' : ''));
    let accumulated = '';
    let modelName = model.modelName;
    let finishReason: string | undefined;
    let tokens: AIResponse['tokens'];

    try {
      const res = await withRetry(
        async () => postChat(url, model, prompt, true, options),
        { retries: options?.retries ?? 2, signal: options?.signal },
      );

      const reader = res.body?.getReader();
      if (!reader) throw new Error(i18n.t('errors:streamReadFailed'));

      const decoder = new TextDecoder();
      let done = false;

      const parser = createSSEParser((payload) => {
        if (payload === '[DONE]') {
          done = true;
          return;
        }
        let parsed: OpenAIChunk;
        try {
          parsed = JSON.parse(payload) as OpenAIChunk;
        } catch {
          return; // 忽略无法解析的事件
        }
        if (parsed.model) modelName = parsed.model;
        const usage = extractOpenAITokenUsage(parsed);
        if (usage) tokens = usage;
        const choice = parsed.choices?.[0];
        const delta = choice?.delta?.content ?? '';
        if (delta) {
          accumulated += delta;
          onChunk({
            content: accumulated,
            model: modelName,
            tokens,
            isComplete: false,
            isStreaming: true,
          });
        }
        if (choice?.finish_reason) finishReason = choice.finish_reason;
      });

      try {
        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone || done) break;
          if (value) parser.push(decoder.decode(value, { stream: true }));
        }
        parser.push(decoder.decode()); // 冲刷解码器残留
        parser.flush();
      } finally {
        reader.releaseLock();
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
        error: isAbortError(error) ? '生成已取消' : i18n.t('errors:streamExceptionGeneric', { message: error instanceof Error ? error.message : String(error) }),
        isComplete: true,
        isStreaming: false,
      });
    }
  },
};
