/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { novelDslLanguage } from '../novelDsl';

function state(doc: string) {
  return EditorState.create({ doc, extensions: [novelDslLanguage] });
}

/** 某位置（文档偏移）的语法 token 类名；纯文本为 null。 */
function tokenAt(s: EditorState, pos: number): string | null {
  const tree = ensureSyntaxTree(s, s.doc.length, 5000);
  if (!tree) return null;
  const node = tree.resolveInner(pos, 1);
  return node.name === 'Document' || node.name === 'Ⓢ' || node.name === 'top' ? null : node.name;
}

/** 找到某子串在文档中的起始偏移。 */
function off(doc: string, needle: string): number {
  const i = doc.indexOf(needle);
  expect(i, `文档应包含「${needle}」`).toBeGreaterThanOrEqual(0);
  return i;
}

describe('novelDsl 语言着色', () => {
  it('Markdown 标题 → heading', () => {
    const doc = '# 第一卷\n正文';
    expect(tokenAt(state(doc), off(doc, '#'))).toBe('heading');
  });

  it('关键字行前缀 → keyword，值段 → string', () => {
    const doc = '# @tag: 林渊 | 林师兄';
    expect(tokenAt(state(doc), off(doc, '@tag'))).toBe('keyword');
    expect(tokenAt(state(doc), off(doc, '林渊'))).toBe('string');
  });

  it('引用行 @pov 前缀 → keyword', () => {
    const doc = '# @pov: 林渊, 苏雪';
    expect(tokenAt(state(doc), off(doc, '@pov'))).toBe('keyword');
  });

  it('场景分隔 *** → separator', () => {
    const doc = '上段\n***\n下段';
    expect(tokenAt(state(doc), off(doc, '***'))).toBe('separator');
  });

  it('wiki 链接 → link', () => {
    const doc = '他去了[[云都]]过夜';
    expect(tokenAt(state(doc), off(doc, '[['))).toBe('link');
  });

  it('占位符 → monospace', () => {
    const doc = '此处{待填}补充';
    expect(tokenAt(state(doc), off(doc, '{待填}'))).toBe('monospace');
  });

  it('行内软标签 → tagName', () => {
    const doc = '与@林渊 对话';
    expect(tokenAt(state(doc), off(doc, '@林渊'))).toBe('tagName');
  });

  it('普通正文不着色', () => {
    const doc = '夜色如墨，他独自前行。';
    expect(tokenAt(state(doc), off(doc, '夜色'))).toBeNull();
  });

  it('顶部 frontmatter 块 → meta', () => {
    const doc = '---\ntitle: 草稿\n---\n# 正文';
    const s = state(doc);
    expect(tokenAt(s, off(doc, 'title'))).toBe('meta');
    // frontmatter 之后的标题恢复正常
    expect(tokenAt(s, off(doc, '# 正文'))).toBe('heading');
  });

  it('非顶部的 --- 不当作 frontmatter', () => {
    const doc = '# 标题\n---\n正文';
    expect(tokenAt(state(doc), off(doc, '正文'))).toBeNull();
  });
});
