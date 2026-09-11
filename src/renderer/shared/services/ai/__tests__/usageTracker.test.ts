/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearUsage, estimateCost, recordUsage, summarize } from '../usageTracker';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    get length() { return map.size; },
  } as unknown as Storage;
}

describe('usageTracker', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => { vi.unstubAllGlobals(); clearUsage(); });

  it('estimateCost：输入输出按百万 token 单价换算', () => {
    expect(estimateCost({ prompt: 1_000_000, completion: 500_000 }, { priceInPerM: 1, priceOutPerM: 2 })).toBe(2);
  });

  it('estimateCost：未配置单价返回 null', () => {
    expect(estimateCost({ prompt: 100, completion: 100 }, {})).toBeNull();
  });

  it('summarize：按模型聚合 token 与费用', () => {
    recordUsage({ modelId: 'm1', modelName: '甲', prompt: 1_000_000, completion: 0, at: Date.now() });
    recordUsage({ modelId: 'm1', modelName: '甲', prompt: 0, completion: 1_000_000, at: Date.now() });
    recordUsage({ modelId: 'm2', modelName: '乙', prompt: 5, completion: 5, at: Date.now() });
    const summary = summarize(0, (id) => (id === 'm1' ? { priceInPerM: 3, priceOutPerM: 3 } : undefined));
    expect(summary.requests).toBe(3);
    expect(summary.rows).toHaveLength(2);
    const m1 = summary.rows.find((r) => r.modelId === 'm1');
    expect(m1?.prompt).toBe(1_000_000);
    expect(m1?.costUsd).toBeCloseTo(3 + 3);
    expect(summary.priced).toBe(true);
  });

  it('summarize：时间范围过滤', () => {
    recordUsage({ modelId: 'm1', modelName: '甲', prompt: 10, completion: 10, at: 1000 });
    expect(summarize(2000, () => undefined).requests).toBe(0);
    expect(summarize(0, () => undefined).requests).toBe(1);
  });
});
