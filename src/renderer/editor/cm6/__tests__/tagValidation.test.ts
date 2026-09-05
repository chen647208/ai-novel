/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { collectTagDiagnostics } from '../tagValidation';

const V = (...tags: string[]) => new Set(tags);

/** 断言诊断命中：返回每条诊断圈出的文本。 */
function flagged(doc: string, valid: Set<string>): string[] {
  return collectTagDiagnostics(doc, valid).map((d) => doc.slice(d.from, d.to));
}

describe('collectTagDiagnostics', () => {
  it('引用行未定义目标 → 波浪线', () => {
    expect(flagged('# @pov: 林渊, 幽灵', V('林渊'))).toEqual(['幽灵']);
  });

  it('引用行全部命中 → 无诊断', () => {
    expect(flagged('# @pov: 林渊, 苏雪', V('林渊', '苏雪'))).toEqual([]);
  });

  it('@tag 声明行不校验自身', () => {
    expect(flagged('# @tag: 林渊 | 林师兄', V())).toEqual([]);
  });

  it('别名命中（集合含别名）', () => {
    expect(flagged('# @character: 林师兄', V('林渊', '林师兄'))).toEqual([]);
  });

  it('wiki 链接目标校验', () => {
    expect(flagged('他去了[[云都]]', V('林渊'))).toEqual(['云都']);
    expect(flagged('他去了[[云都|帝都]]', V('云都'))).toEqual([]);
  });

  it('行内软标签校验', () => {
    expect(flagged('与@林渊 和@幽灵 对话', V('林渊'))).toEqual(['幽灵']);
  });

  it('关键字行不把 @pov 误判为软标签', () => {
    expect(flagged('# @pov: 林渊', V('林渊'))).toEqual([]);
  });

  it('未知关键字行忽略', () => {
    expect(flagged('# @unknown: 随便', V())).toEqual([]);
  });

  it('多行偏移正确', () => {
    const doc = '# @tag: 林渊\n\n他去了[[云都]]\n与@幽灵 对话';
    const diags = collectTagDiagnostics(doc, V('林渊'));
    expect(diags).toHaveLength(2);
    for (const d of diags) {
      expect(['云都', '幽灵']).toContain(doc.slice(d.from, d.to));
    }
  });

  it('空标签集 → 所有引用都标红', () => {
    expect(flagged('# @pov: 林渊', V())).toEqual(['林渊']);
  });

  it('短标签（<2 字符）不作为软标签', () => {
    expect(flagged('邮箱 a@b.com', V())).toEqual([]);
  });
});
