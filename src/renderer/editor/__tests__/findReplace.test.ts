/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { getSchema } from '@tiptap/core';
import { createNovelExtensions } from '../schema';
import { findMatches } from '../findReplace';

const schema = getSchema(createNovelExtensions());

const docOf = (text: string) =>
  schema.nodeFromJSON({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

describe('findMatches', () => {
  it('空查询返回空', () => {
    expect(findMatches(docOf('你好世界'), '')).toEqual([]);
    expect(findMatches(docOf('你好世界'), '   ')).toEqual([]);
  });

  it('大小写不敏感命中全部', () => {
    const doc = docOf('林渊说林渊走了');
    const hits = findMatches(doc, '林渊');
    expect(hits).toHaveLength(2);
    expect(doc.textBetween(hits[0]!.from, hits[0]!.to)).toBe('林渊');
    expect(doc.textBetween(hits[1]!.from, hits[1]!.to)).toBe('林渊');
  });

  it('大小写敏感区分', () => {
    const doc = docOf('Hello hello');
    expect(findMatches(doc, 'Hello', true)).toHaveLength(1);
    expect(findMatches(doc, 'hello', false)).toHaveLength(2);
  });

  it('跨段落分别定位', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '第一章开始' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '第二章开始' }] },
      ],
    });
    const hits = findMatches(doc, '开始');
    expect(hits).toHaveLength(2);
    expect(hits[0]!.from).toBeLessThan(hits[1]!.from);
  });

  it('无命中返回空数组', () => {
    expect(findMatches(docOf('你好世界'), '再见')).toEqual([]);
  });
});
