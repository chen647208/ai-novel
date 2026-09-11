/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { AIMessageImage, ModelConfig } from '../../shared/types.js';
import type { ChatContentPart, AdapterChatMessage, TokenUsage } from './types.js';

/** 构建消息数组（系统提示词 + 用户提示词）——全适配器共用；附图挂在末条 user 消息后 */
export function buildMessages(model: ModelConfig, prompt: string, images?: AIMessageImage[]): AdapterChatMessage[] {
  const messages: AdapterChatMessage[] = [];
  const systemPrompt = model.systemPrompt?.trim();
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  if (images && images.length > 0) {
    const parts: ChatContentPart[] = [{ type: 'text', text: prompt }];
    for (const img of images) {
      parts.push({ type: 'image', mime: img.mime, dataUrl: img.dataUrl });
    }
    messages.push({ role: 'user', content: parts });
    return messages;
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

/** 文本抽取：parts 形态只取 text（日志/回退路径用）。 */
export function messageText(content: AdapterChatMessage['content']): string {
  if (typeof content === 'string') return content;
  return content.filter((p) => p.type === 'text').map((p) => p.text).join('\n');
}

/**
 * 清理模型输出：去除部分中间件/模型错误包裹的 ``` 代码围栏。
 * 仅当整体被围栏包裹时才剥离，避免误删正文中合法的代码块示例。
 */
export function cleanModelOutput(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?\s*```$/);
  return match ? match[1]?.trim() ?? trimmed : trimmed;
}

/** 从 OpenAI 兼容响应体提取 token 用量 */
export function extractOpenAITokenUsage(data: unknown): TokenUsage | undefined {
  const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } })?.usage;
  if (!usage) return undefined;
  return {
    prompt: usage.prompt_tokens ?? 0,
    completion: usage.completion_tokens ?? 0,
    total: usage.total_tokens ?? 0,
  };
}

/** 从 Gemini 原生 usageMetadata 提取 token 用量 */
export function extractGeminiTokenUsage(data: unknown): TokenUsage | undefined {
  const meta = (data as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } })
    ?.usageMetadata;
  if (!meta) return undefined;
  return {
    prompt: meta.promptTokenCount ?? 0,
    completion: meta.candidatesTokenCount ?? 0,
    total: meta.totalTokenCount ?? 0,
  };
}

/** 从 Anthropic Messages 响应体提取 token 用量（含缓存读写计数） */
export function extractAnthropicTokenUsage(data: unknown): TokenUsage | undefined {
  const usage = (
    data as {
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
    }
  )?.usage;
  if (!usage) return undefined;
  const prompt = usage.input_tokens ?? 0;
  const completion = usage.output_tokens ?? 0;
  const result: TokenUsage = { prompt, completion, total: prompt + completion };
  if (typeof usage.cache_read_input_tokens === 'number') result.cacheRead = usage.cache_read_input_tokens;
  if (typeof usage.cache_creation_input_tokens === 'number') result.cacheWrite = usage.cache_creation_input_tokens;
  return result;
}

/** 从 OpenAI Responses API 响应体提取 token 用量（input_tokens / output_tokens / total_tokens） */
export function extractResponsesTokenUsage(data: unknown): TokenUsage | undefined {
  const usage = (data as { usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } })?.usage;
  if (!usage) return undefined;
  const prompt = usage.input_tokens ?? 0;
  const completion = usage.output_tokens ?? 0;
  return { prompt, completion, total: usage.total_tokens ?? prompt + completion };
}

/** 规范化端点：去尾斜杠并拼接 chat/completions */
export function openAIChatUrl(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

/** 读取失败响应的可读错误信息（优先 JSON.error.message，回退文本/状态行） */
export async function readErrorResponse(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const json = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return json.error?.message || json.message || text.slice(0, 200) || res.statusText;
  } catch {
    return text.slice(0, 200) || res.statusText;
  }
}

/** 判断是否被用户主动中止 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
