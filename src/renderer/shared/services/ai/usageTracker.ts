/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * AI 用量与费用跟踪（参考 CC Switch 用量可见性）：
 * 每次成功调用记一条（模型/输入输出 token/缓存/时间），本地留存最近 MAX_ENTRIES 条；
 * 按模型聚合 token 与费用（单价来自 ModelConfig.priceInPerM/priceOutPerM，缺省不计费）。
 * 纯函数 summarize/estimateCost 可单测；持久化用 localStorage，不写业务库。
 */
import { STORAGE_KEYS } from '@shared/constants/storageKeys';
import type { ModelConfig } from '@shared/types';

import { localStore } from '@/shared/services/localStore';

export interface UsageEntry {
  modelId: string;
  modelName: string;
  prompt: number;
  completion: number;
  cacheRead?: number;
  cacheWrite?: number;
  at: number;
}

export interface UsageSummaryRow {
  modelId: string;
  modelName: string;
  prompt: number;
  completion: number;
  cacheRead: number;
  cacheWrite: number;
  requests: number;
  costUsd: number;
}

export interface UsageSummary {
  requests: number;
  prompt: number;
  completion: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number;
  /** 是否至少有一个模型配置了单价（否则 costUsd 仅为 0，不代表真实费用）。 */
  priced: boolean;
  rows: UsageSummaryRow[];
}

const MAX_ENTRIES = 5000;
export const USAGE_KEY = STORAGE_KEYS.aiUsage;

/** 单次调用费用（美元）：需两项单价均配置才计费（任缺则返回 null）。 */
export function estimateCost(tokens: { prompt: number; completion: number }, pricing: Pick<ModelConfig, 'priceInPerM' | 'priceOutPerM'>): number | null {
  if (typeof pricing.priceInPerM !== 'number' && typeof pricing.priceOutPerM !== 'number') return null;
  const inCost = ((tokens.prompt) / 1_000_000) * (pricing.priceInPerM ?? 0);
  const outCost = ((tokens.completion) / 1_000_000) * (pricing.priceOutPerM ?? 0);
  return inCost + outCost;
}

function readAll(): UsageEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStore.getItem(USAGE_KEY);
    return raw ? (JSON.parse(raw) as UsageEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: UsageEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStore.setItem(USAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // 存储不可用或超限时忽略：用量是辅助信息，不阻断主流程
  }
}

/** 记录一次调用（无 token 信息时跳过）。 */
export function recordUsage(entry: UsageEntry): void {
  if (!entry.prompt && !entry.completion) return;
  writeAll([...readAll(), entry]);
}

/** 清空用量记录。 */
export function clearUsage(): void {
  writeAll([]);
}

/** 指定时刻起的请求数（配额判断用）。 */
export function countSince(sinceMs: number): number {
  return readAll().filter((e) => e.at >= sinceMs).length;
}

const HOUR_MS = 3600_000;

/** 每小时请求上限；0 或非法值表示不限。 */
export function getHourlyLimit(): number {
  if (typeof localStorage === 'undefined') return 0;
  const n = Number(localStore.getItem(STORAGE_KEYS.aiHourlyLimit));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function setHourlyLimit(limit: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStore.setItem(STORAGE_KEYS.aiHourlyLimit, String(Math.max(0, Math.floor(limit))));
  } catch {
    // 忽略
  }
}

/** 是否已达每小时上限。 */
export function isOverHourlyLimit(): boolean {
  const limit = getHourlyLimit();
  return limit > 0 && countSince(Date.now() - HOUR_MS) >= limit;
}

/** 按模型聚合；pricingOf 返回该模型的单价配置。 */
export function summarize(sinceMs: number, pricingOf: (modelId: string) => Pick<ModelConfig, 'priceInPerM' | 'priceOutPerM'> | undefined): UsageSummary {
  const rows = new Map<string, UsageSummaryRow>();
  let priced = false;
  let total = { requests: 0, prompt: 0, completion: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 };
  for (const e of readAll()) {
    if (e.at < sinceMs) continue;
    const row = rows.get(e.modelId) ?? {
      modelId: e.modelId, modelName: e.modelName, prompt: 0, completion: 0, cacheRead: 0, cacheWrite: 0, requests: 0, costUsd: 0,
    };
    const pricing = pricingOf(e.modelId);
    const cost = estimateCost({ prompt: e.prompt, completion: e.completion }, pricing ?? {});
    if (cost !== null) { row.costUsd += cost; priced = true; }
    row.prompt += e.prompt;
    row.completion += e.completion;
    row.cacheRead += e.cacheRead ?? 0;
    row.cacheWrite += e.cacheWrite ?? 0;
    row.requests += 1;
    rows.set(e.modelId, row);
    total = {
      requests: total.requests + 1,
      prompt: total.prompt + e.prompt,
      completion: total.completion + e.completion,
      cacheRead: total.cacheRead + (e.cacheRead ?? 0),
      cacheWrite: total.cacheWrite + (e.cacheWrite ?? 0),
      costUsd: total.costUsd + (cost ?? 0),
    };
  }
  return { ...total, priced, rows: [...rows.values()].sort((a, b) => b.requests - a.requests) };
}
