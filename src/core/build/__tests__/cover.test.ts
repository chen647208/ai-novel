/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import { buildCoverSvg, escapeXml, wrapTitle } from '../cover';

describe('escapeXml', () => {
  it('转义 XML 特殊字符', () => {
    expect(escapeXml('a&b<c>d"e\'f')).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
});

describe('wrapTitle', () => {
  it('中文按每行字数折行', () => {
    expect(wrapTitle('一二三四五六七八九十', 4)).toEqual(['一二三四', '五六七八', '九十']);
  });
  it('西文按词折行', () => {
    expect(wrapTitle('the quick brown fox', 10)).toEqual(['the quick', 'brown fox']);
  });
  it('空标题返回单个空行', () => {
    expect(wrapTitle('   ')).toEqual(['']);
  });
});

describe('buildCoverSvg', () => {
  it('包含标题、印记与合法 svg 根', () => {
    const svg = buildCoverSvg({ title: '雾港纪元', subtitle: '潮汐与旧神', imprint: '红月创作' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('雾港纪元');
    expect(svg).toContain('红月创作');
    expect(svg).toContain('width="1200"');
  });

  it('标题含特殊字符被转义', () => {
    const svg = buildCoverSvg({ title: 'A<B>&C' });
    expect(svg).toContain('A&lt;B&gt;&amp;C');
    expect(svg).not.toContain('A<B>');
  });
});
