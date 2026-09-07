/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { ModelConfig, AIResponse, StreamingAIResponse } from '../../shared/types.js';

/** 统一的对话消息结构（适配器内部使用） */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 单次调用选项 */
export interface CallOptions {
  /** 取消信号：中止请求并立即停止流式读取 */
  signal?: AbortSignal;
  /** 瞬时失败（网络/429/5xx）的额外重试次数，默认 2 */
  retries?: number;
}

/** Provider 适配器接口：每个上游协议实现一份 */
export interface ProviderAdapter {
  /** 该适配器对此模型配置是否支持真流式输出 */
  supportsStreaming(model: ModelConfig): boolean;
  /** 一次性补全（内部可含重试），错误以 AIResponse.error 返回，不抛出 */
  complete(model: ModelConfig, prompt: string, options?: CallOptions): Promise<AIResponse>;
  /** 流式补全：onChunk 收到增量（content 为累计值），完成时 isComplete=true */
  stream(
    model: ModelConfig,
    prompt: string,
    onChunk: (response: StreamingAIResponse) => void,
    options?: CallOptions,
  ): Promise<void>;
}

/** 请求错误：携带 HTTP 状态与可重试性判定，供重试层消费 */
export class AIRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable: boolean = false,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'AIRequestError';
  }
}

/** token 用量 */
export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  /** 缓存命中读入（Anthropic cache_read_input_tokens；OpenAI/Gemini 自动缓存不透出则缺席） */
  cacheRead?: number;
  /** 缓存写入（Anthropic cache_creation_input_tokens） */
  cacheWrite?: number;
}

/**
 * 未显式设置 temperature 时的统一默认值。
 * 两个适配器共用此常量，保证“未配置即同一默认”的可预期行为。
 */
export const DEFAULT_TEMPERATURE = 0.7;
