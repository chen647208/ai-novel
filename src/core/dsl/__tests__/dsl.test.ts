/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { parseFrontmatter, serializeFrontmatter, serializeDocument, parseDocument } from '../frontmatter';
import { parseKeywords } from '../keywords';
import type { Frontmatter } from '../frontmatter';

describe('frontmatter 往返', () => {
  const cases: Frontmatter[] = [
    { type: 'card.character', title: '林渊', status: 'main' },
    { type: 'novel.chapter', tags: ['战斗', '感情线'], wordGoal: '3000' },
    { type: 'x', emptyList: [], quoted: 'a: b #c', withHash: '前缀#无空格' },
    { unicode: '你好，世界 —— 破折号' },
  ];

  it('serialize → parse 无损', () => {
    for (const fm of cases) {
      const text = serializeDocument(fm, '正文内容\n第二行');
      const back = parseDocument(text);
      expect(back.frontmatter).toEqual(fm);
      expect(back.body).toBe('正文内容\n第二行');
    }
  });

  it('规范形式二次序列化稳定', () => {
    for (const fm of cases) {
      const once = serializeFrontmatter(fm);
      const twice = serializeFrontmatter(parseFrontmatter(`${once}\nbody`).frontmatter);
      expect(twice).toBe(once);
    }
  });

  it('无 frontmatter 的文本原样返回', () => {
    const { frontmatter, body } = parseFrontmatter('就是正文\n没有头');
    expect(frontmatter).toEqual({});
    expect(body).toBe('就是正文\n没有头');
  });

  it('未闭合的 --- 视为无 frontmatter（容错）', () => {
    const { frontmatter } = parseFrontmatter('---\ntype: x\n没有闭合');
    expect(frontmatter).toEqual({});
  });
});

describe('关键字解析', () => {
  const body = [
    '# @tag: 林渊 | 林师兄, 小渊',
    '正文第一段。',
    '# @pov: 林渊, 苏雪',
    '他来到了[[云都]]，也就是[[云都|云端帝都]]。',
    '# @strand: 主线A',
    '# @unknown-keyword: 应被忽略',
  ].join('\n');

  it('声明/引用/硬链接各归其位', () => {
    const r = parseKeywords(body);
    expect(r.declarations).toHaveLength(1);
    expect(r.declarations[0]).toMatchObject({ tag: '林渊', aliases: ['林师兄', '小渊'] });
    expect(r.references.map((x) => x.keyword)).toEqual(['pov', 'strand']);
    expect(r.references[0]?.targets).toEqual(['林渊', '苏雪']);
    expect(r.wikiLinks).toHaveLength(2);
    expect(r.wikiLinks[1]?.display).toBe('云端帝都');
  });

  it('行号正确（1 起）', () => {
    const r = parseKeywords(body);
    expect(r.declarations[0]?.line).toBe(1);
    expect(r.references[0]?.line).toBe(3);
  });
});
