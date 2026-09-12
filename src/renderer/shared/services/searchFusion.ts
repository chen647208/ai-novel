/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 倒数排名融合（RRF）：多路有序结果的纯函数合并，供混合检索复用。 */

/** RRF 常数：越大越平滑，60 为常用默认。 */
export const RRF_K = 60;

/**
 * 把多路有序结果按 `Σ 1/(k+rank)` 合并去重。
 * keyOf 决定同一实体在跨路时的身份（同 key 累加得分）。
 */
export function reciprocalRankFusion<T>(
  rankedLists: ReadonlyArray<ReadonlyArray<T>>,
  keyOf: (item: T) => string,
  k = RRF_K,
): T[] {
  const scores = new Map<string, { score: number; item: T }>();
  for (const list of rankedLists) {
    list.forEach((item, index) => {
      const key = keyOf(item);
      const add = 1 / (k + index + 1);
      const existing = scores.get(key);
      if (existing) existing.score += add;
      else scores.set(key, { score: add, item });
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score).map((entry) => entry.item);
}
