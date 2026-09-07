/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { aiT } from './i18n.js';
import { AIRequestError } from './types.js';

/** 判断错误是否值得重试：网络异常、429、5xx */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AIRequestError) return error.retryable;
  // fetch 网络失败抛 TypeError；AbortError 不重试
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  if (error instanceof TypeError) return true; // Failed to fetch
  if (error instanceof Error && /network|ECONNRESET|ETIMEDOUT|fetch failed/i.test(error.message)) return true;
  return false;
}

/** 从错误中提取 HTTP 状态码（若有） */
function statusOf(error: unknown): number | undefined {
  return error instanceof AIRequestError ? error.status : undefined;
}

export interface RetryOptions {
  /** 额外重试次数，默认 2 */
  retries?: number;
  /** 首次退避基数（毫秒），默认 800 */
  baseDelayMs?: number;
  /** 单次最大等待（毫秒），默认 15000 */
  maxDelayMs?: number;
  signal?: AbortSignal;
  /** 每次即将重试时回调 */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * 指数退避 + 抖动重试。
 * - 429 响应若带 Retry-After（AIRequestError.retryAfterMs）则优先遵守
 * - 尊重 AbortSignal：等待期间可被取消
 */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 2, baseDelayMs = 800, maxDelayMs = 15000, signal, onRetry } = options;
  let attempt = 0;

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      return await fn(attempt);
    } catch (error) {
      attempt += 1;
      const retryable = isRetryableError(error) && attempt <= retries;
      if (!retryable) throw error;

      const status = statusOf(error);
      const serverHint = error instanceof AIRequestError ? error.retryAfterMs : undefined;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      // 抖动 ±25%，避免多请求同步重试
      const jitter = backoff * (0.75 + Math.random() * 0.5);
      const delay = Math.max(backoff, status === 429 && serverHint ? serverHint : 0, jitter);

      onRetry?.(error, attempt, Math.round(delay));
      await sleep(delay, signal);
    }
  }
}

/** 从失败响应构造 AIRequestError（统一状态码→可重试映射与 Retry-After 解析） */
export function requestErrorFromResponse(status: number, statusText: string, bodySnippet: string): AIRequestError {
  const retryable = status === 429 || status >= 500;
  return new AIRequestError(aiT('requestFailedStatus', { status, detail: bodySnippet || statusText }), status, retryable);
}

/** 解析 Retry-After 头（秒）为毫秒 */
export function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(headerValue);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}
