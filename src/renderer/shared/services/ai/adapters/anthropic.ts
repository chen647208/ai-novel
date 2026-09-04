/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * Anthropic Messages 适配器（provider=anthropic）。
 * 覆盖官方 api.anthropic.com 与 Anthropic 兼容网关（如 MiniMax /anthropic/v1）。
 *
 * 协议要点（对照官方文档）：
 *  - 鉴权用 x-api-key + anthropic-version 头，而非 Bearer；
 *  - max_tokens 为必填，未配置时兜底 8192；
 *  - temperature 合法区间 0–1，超出自动收敛（小说默认温度 1.0 恰在上界）；
 *  - system 提示词走顶层 system 字段，不混入 messages；
 *  - 流式为 SSE，事件 message_start / content_block_delta(text_delta) / message_delta / message_stop。
 */
import { i18n } from '@/i18n';
import type { ModelConfig, AIResponse, StreamingAIResponse } from '../../../../../shared/types';
import {
  buildMessages,
  cleanModelOutput,
  extractAnthropicTokenUsage,
  isAbortError,
  readErrorResponse,
} from '../messages.js';
import { createSSEParser } from '../sse.js';
import { AIRequestError, DEFAULT_TEMPERATURE, type CallOptions, type ProviderAdapter } from '../types.js';
import { parseRetryAfter, requestErrorFromResponse, withRetry } from '../retry.js';

const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_DEFAULT_MAX_TOKENS = 8192;

interface AnthropicContentBlock {
  type?: string;
  text?: string;
}
interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}
interface AnthropicStreamEvent {
  type?: string;
  delta?: { type?: string; text?: string; stop_reason?: string };
  message?: AnthropicResponse;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

/**
 * 规范化 Messages 端点：兼容两种 base 形态。
 *   https://api.anthropic.com            → .../v1/messages
 *   https://api.minimaxi.com/anthropic/v1 → .../anthropic/v1/messages
 * 已含 /messages 的原样返回；去尾斜杠。
 */
export function anthropicMessagesUrl(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  if (base.endsWith('/messages')) return base;
  if (base.endsWith('/v1')) return `${base}/messages`;
  return `${base}/v1/messages`;
}

/** Anthropic temperature 合法区间 0–1；非法值回退默认。 */
export function clampAnthropicTemperature(value: number | undefined): number {
  const t = value ?? DEFAULT_TEMPERATURE;
  if (!Number.isFinite(t)) return DEFAULT_TEMPERATURE;
  return Math.min(1, Math.max(0, t));
}

function anthropicPayload(model: ModelConfig, prompt: string): { system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } {
  const chat = buildMessages(model, prompt);
  const system = chat.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n') || undefined;
  const messages = chat
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  return { system, messages };
}

function anthropicBody(model: ModelConfig, prompt: string, stream: boolean): Record<string, unknown> {
  const { system, messages } = anthropicPayload(model, prompt);
  const body: Record<string, unknown> = {
    model: model.modelName,
    messages,
    max_tokens: model.maxTokens ?? ANTHROPIC_DEFAULT_MAX_TOKENS,
    temperature: clampAnthropicTemperature(model.temperature),
    stream,
  };
  if (system) body.system = system;
  return body;
}

function anthropicText(data: AnthropicResponse): string {
  return (data.content ?? [])
    .filter((b) => b.type === 'text' || typeof b.text === 'string')
    .map((b) => b.text ?? '')
    .join('');
}

async function postAnthropic(
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
      'x-api-key': model.apiKey ?? '',
      'anthropic-version': ANTHROPIC_VERSION,
      ...(stream ? { accept: 'text/event-stream' } : {}),
    },
    body: JSON.stringify(anthropicBody(model, prompt, stream)),
  });

  if (!res.ok) {
    const message = await readErrorResponse(res);
    const err = requestErrorFromResponse(res.status, res.statusText, message);
    throw new AIRequestError(err.message, err.status, err.retryable, parseRetryAfter(res.headers.get('retry-after')));
  }
  return res;
}

export const anthropicAdapter: ProviderAdapter = {
  supportsStreaming(model: ModelConfig): boolean {
    return model.supportsStreaming !== false;
  },

  async complete(model: ModelConfig, prompt: string, options?: CallOptions): Promise<AIResponse> {
    if (!model.apiKey) {
      return { content: '', error: i18n.t('errors:apiKeyMissing', { provider: 'Anthropic' }) };
    }
    if (!model.endpoint?.trim()) {
      return { content: '', error: i18n.t('errors:endpointMissing', { provider: 'Anthropic' }) };
    }
    const url = anthropicMessagesUrl(model.endpoint);
    try {
      const data = await withRetry(
        async () => {
          const res = await postAnthropic(url, model, prompt, false, options);
          return (await res.json()) as AnthropicResponse;
        },
        { retries: options?.retries ?? 2, signal: options?.signal },
      );
      return {
        content: cleanModelOutput(anthropicText(data)),
        tokens: extractAnthropicTokenUsage(data),
        model: model.modelName,
        finishReason: data.stop_reason ?? undefined,
        metadata: { prompt, modelConfig: model },
      };
    } catch (error) {
      if (isAbortError(error)) {
        return { content: '', error: '请求已取消', metadata: { prompt, modelConfig: model } };
      }
      return {
        content: '',
        error: i18n.t('errors:requestFailed', { provider: 'Anthropic', message: error instanceof Error ? error.message : String(error) }),
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
      onChunk({ content: '', error: i18n.t('errors:apiKeyMissing', { provider: 'Anthropic' }), isComplete: true });
      return;
    }
    if (!model.endpoint?.trim()) {
      onChunk({ content: '', error: i18n.t('errors:endpointMissing', { provider: 'Anthropic' }), isComplete: true });
      return;
    }
    if (model.supportsStreaming === false) {
      const response = await this.complete(model, prompt, options);
      onChunk({ ...response, isComplete: true, isStreaming: false });
      return;
    }

    const url = anthropicMessagesUrl(model.endpoint);
    let accumulated = '';
    let finishReason: string | undefined;
    let promptTokens = 0;
    let completionTokens = 0;
    let streamError: string | undefined;

    const currentTokens = (): AIResponse['tokens'] =>
      promptTokens || completionTokens
        ? { prompt: promptTokens, completion: completionTokens, total: promptTokens + completionTokens }
        : undefined;

    try {
      const res = await withRetry(
        async () => postAnthropic(url, model, prompt, true, options),
        { retries: options?.retries ?? 2, signal: options?.signal },
      );

      const reader = res.body?.getReader();
      if (!reader) throw new Error(i18n.t('errors:streamReadFailed'));

      const decoder = new TextDecoder();
      let done = false;

      const parser = createSSEParser((payload) => {
        let parsed: AnthropicStreamEvent;
        try {
          parsed = JSON.parse(payload) as AnthropicStreamEvent;
        } catch {
          return; // 忽略无法解析的事件
        }
        switch (parsed.type) {
          case 'message_start':
            promptTokens = parsed.message?.usage?.input_tokens ?? promptTokens;
            break;
          case 'content_block_delta': {
            const delta = parsed.delta;
            if (delta?.type === 'text_delta' && delta.text) {
              accumulated += delta.text;
              onChunk({
                content: accumulated,
                model: model.modelName,
                tokens: currentTokens(),
                isComplete: false,
                isStreaming: true,
              });
            }
            break;
          }
          case 'message_delta':
            if (parsed.delta?.stop_reason) finishReason = parsed.delta.stop_reason;
            completionTokens = parsed.usage?.output_tokens ?? completionTokens;
            break;
          case 'message_stop':
            done = true;
            break;
          case 'error':
            streamError = parsed.error?.message ?? i18n.t('errors:streamError', { provider: 'Anthropic' });
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
        model: model.modelName,
        finishReason,
        tokens: currentTokens(),
        isComplete: true,
        isStreaming: false,
        metadata: { prompt, modelConfig: model },
      });
    } catch (error) {
      onChunk({
        content: accumulated,
        error: isAbortError(error) ? '生成已取消' : i18n.t('errors:streamException', { provider: 'Anthropic', message: error instanceof Error ? error.message : String(error) }),
        isComplete: true,
        isStreaming: false,
      });
    }
  },
};
