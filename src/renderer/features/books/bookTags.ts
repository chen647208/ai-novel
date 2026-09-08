/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 书籍标签纯函数（docs/design/15）：输入归一化与过滤。 */

export const MAX_BOOK_TAGS = 20;
export const MAX_TAG_LENGTH = 16;

/** 自由输入归一化：逗号/空格/顿号分隔，去空去重，超长截断，超数截尾。 */
export function normalizeTagInput(input: string): string[] {
  const tags: string[] = [];
  for (const raw of input.split(/[,，、\s]+/)) {
    const tag = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag || tags.includes(tag)) continue;
    tags.push(tag);
    if (tags.length >= MAX_BOOK_TAGS) break;
  }
  return tags;
}

/** 标签过滤：无选中即全量；命中任一选中标签即保留。 */
export function filterBooksByTags<T extends { tags?: string[] }>(books: T[], selected: string[]): T[] {
  if (selected.length === 0) return books;
  const wanted = new Set(selected);
  return books.filter((b) => (b.tags ?? []).some((tag) => wanted.has(tag)));
}

/** 全库标签表：按出现频次降序（ ties 按首现顺序）。 */
export function collectAllTags<T extends { tags?: string[] }>(books: T[]): string[] {
  const count = new Map<string, number>();
  for (const b of books) {
    for (const tag of b.tags ?? []) {
      count.set(tag, (count.get(tag) ?? 0) + 1);
    }
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
}
