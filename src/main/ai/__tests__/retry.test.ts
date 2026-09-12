/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it, vi } from 'vitest';

import { isRetryableError, makeIdempotencyKey, parseRetryAfter, requestErrorFromResponse,withRetry } from '../retry.js';
import { AIRequestError } from '../types.js';

describe('isRetryableError', () => {
  it('429/5xx 可重试，4xx 不可', () => {
    expect(isRetryableError(new AIRequestError('x', 429, true))).toBe(true);
    expect(isRetryableError(new AIRequestError('x', 503, true))).toBe(true);
    expect(isRetryableError(new AIRequestError('x', 401, false))).toBe(false);
  });

  it('网络 TypeError 可重试，AbortError 不可', () => {
    expect(isRetryableError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryableError(new DOMException('Aborted', 'AbortError'))).toBe(false);
  });
});

describe('withRetry', () => {
  it('成功时不重试', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1 })).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('瞬时失败后成功', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AIRequestError('boom', 503, true))
      .mockResolvedValue('ok');
    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('不可重试错误立即抛出', async () => {
    const fn = vi.fn().mockRejectedValue(new AIRequestError('denied', 403, false));
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1 })).rejects.toThrow('denied');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('超出重试次数后抛出最后错误', async () => {
    const fn = vi.fn().mockRejectedValue(new AIRequestError('down', 500, true));
    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 })).rejects.toThrow('down');
    expect(fn).toHaveBeenCalledTimes(3); // 首次 + 2 次重试
  });

  it('已中止的 signal 直接拒绝', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn().mockResolvedValue('never');
    await expect(withRetry(fn, { retries: 1, baseDelayMs: 1, signal: controller.signal })).rejects.toThrow();
    expect(fn).not.toHaveBeenCalled();
  });

  it('同一请求的重试复用同一幂等键', async () => {
    const keys: string[] = [];
    const fn = vi.fn(async (_attempt: number, key: string) => {
      keys.push(key);
      if (keys.length === 1) throw new AIRequestError('retry me', 503, true);
      return 'ok';
    });
    await withRetry(fn, { retries: 2, baseDelayMs: 1 });
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).toBe(keys[1]);
  });
});

describe('requestErrorFromResponse 分类', () => {
  it('鉴权/限流/服务端/坏请求分别归类', () => {
    expect(requestErrorFromResponse(401, '', '').kind).toBe('auth');
    expect(requestErrorFromResponse(429, '', '').kind).toBe('rate-limit');
    expect(requestErrorFromResponse(503, '', '').kind).toBe('server');
    expect(requestErrorFromResponse(422, '', '').kind).toBe('bad-request');
  });

  it('幂等键非空', () => {
    expect(makeIdempotencyKey()).toMatch(/\S/);
  });
});

describe('parseRetryAfter', () => {
  it('解析秒数', () => {
    expect(parseRetryAfter('3')).toBe(3000);
  });
  it('解析 HTTP 日期', () => {
    const future = new Date(Date.now() + 5000).toUTCString();
    const ms = parseRetryAfter(future);
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(ms).toBeLessThanOrEqual(6000);
  });
  it('无效值返回 undefined', () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter('garbage')).toBeUndefined();
  });
});
