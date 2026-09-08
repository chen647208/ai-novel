/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { collectAllTags, filterBooksByTags, normalizeTagInput } from '../bookTags';

describe('normalizeTagInput', () => {
  it('逗号/空格/顿号分隔，去空去重', () => {
    expect(normalizeTagInput('玄幻， 热血 玄幻、,  ')).toEqual(['玄幻', '热血']);
  });

  it('超长截断，超数截尾', () => {
    expect(normalizeTagInput('a'.repeat(30))).toEqual(['a'.repeat(16)]);
    const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(',');
    expect(normalizeTagInput(many)).toHaveLength(20);
  });
});

describe('filterBooksByTags', () => {
  const books = [
    { id: 'a', tags: ['玄幻'] },
    { id: 'b', tags: ['言情'] },
    { id: 'c' },
  ];

  it('无选中即全量', () => {
    expect(filterBooksByTags(books, [])).toBe(books);
  });

  it('命中任一即保留，无标签书被滤掉', () => {
    expect(filterBooksByTags(books, ['玄幻', '言情']).map((b) => b.id)).toEqual(['a', 'b']);
    expect(filterBooksByTags(books, ['玄幻']).map((b) => b.id)).toEqual(['a']);
  });
});

describe('collectAllTags', () => {
  it('按频次降序', () => {
    const books = [{ tags: ['a', 'b'] }, { tags: ['b', 'c'] }, {}];
    expect(collectAllTags(books)).toEqual(['b', 'a', 'c']);
  });
});
