/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { describe, it, expect } from 'vitest';
import { dslToPmDoc, pmDocToDsl, type PmNode } from '../serialization';

function topTypes(doc: PmNode): string[] {
  return (doc.content ?? []).map((b) => b.type);
}

describe('dslToPmDoc', () => {
  it('段落/标题/场景分隔/关键字行分类正确', () => {
    const doc = dslToPmDoc('# @pov: 林渊\n\n第一段。\n\n## 小节\n\n正文。\n\n***\n\n新场景。');
    expect(topTypes(doc)).toEqual(['keywordLine', 'paragraph', 'heading', 'paragraph', 'sceneBreak', 'paragraph']);
  });

  it('关键字行与真标题以 @ 区分', () => {
    const kw = dslToPmDoc('# @strand: 主线A').content?.[0];
    expect(kw?.type).toBe('keywordLine');
    expect(kw?.attrs).toMatchObject({ keyword: 'strand', value: '主线A' });
    const h = dslToPmDoc('# 真正的标题').content?.[0];
    expect(h?.type).toBe('heading');
    expect(h?.attrs).toMatchObject({ level: 1 });
  });

  it('行内 [[硬链接]] 解析为 chapterRef（含别名）', () => {
    const para = dslToPmDoc('他去了[[云都]]和[[旧都|废都]]。').content?.[0];
    const types = (para?.content ?? []).map((n) => n.type);
    expect(types).toEqual(['text', 'chapterRef', 'text', 'chapterRef', 'text']);
    const refs = (para?.content ?? []).filter((n) => n.type === 'chapterRef');
    expect(refs[0]?.attrs).toMatchObject({ tag: '云都', display: null });
    expect(refs[1]?.attrs).toMatchObject({ tag: '旧都', display: '废都' });
  });

  it('行内 {占位符} 解析为 placeholder（含类型）', () => {
    const para = dslToPmDoc('此处填{主角名|name}。').content?.[0];
    const ph = (para?.content ?? []).find((n) => n.type === 'placeholder');
    expect(ph?.attrs).toMatchObject({ name: '主角名', kind: 'name' });
  });

  it('段内软换行保留为 hardBreak', () => {
    const para = dslToPmDoc('第一行\n第二行').content?.[0];
    expect((para?.content ?? []).some((n) => n.type === 'hardBreak')).toBe(true);
  });

  it('空正文得到单个空段落', () => {
    const doc = dslToPmDoc('');
    expect(topTypes(doc)).toEqual(['paragraph']);
  });
});

describe('pmDocToDsl', () => {
  it('canonical DSL 文本往返稳定（parse→serialize 幂等）', () => {
    const canonical = [
      '# @pov: 林渊',
      '',
      '他走进了[[云都]]的城门。',
      '',
      '这是第二段，提到[[云都|帝都]]和{name|fact}占位。',
      '',
      '***',
      '',
      '新场景开始。',
      '',
    ].join('\n');
    expect(pmDocToDsl(dslToPmDoc(canonical))).toBe(canonical);
  });

  it('二次往返结构不变（serialize→parse→serialize 稳定）', () => {
    const src = '# @tag: 林渊 | 林师兄\n\n正文含[[林渊]]。\n\n## 标题\n\n段落二。';
    const once = pmDocToDsl(dslToPmDoc(src));
    const twice = pmDocToDsl(dslToPmDoc(once));
    expect(twice).toBe(once);
  });

  it('标题级别还原为对应 # 数', () => {
    const dsl = pmDocToDsl(dslToPmDoc('### 三级'));
    expect(dsl.startsWith('### 三级')).toBe(true);
  });
});
