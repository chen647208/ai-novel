/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { Project } from '@shared/types';
import { describe, expect,it } from 'vitest';

import { buildChapterContextBlock,parseChaptersFromAI } from '../chapterOutline';

const fallbacks = { titleFor: (n: number) => `第${n}章`, defaultSummary: '（无）' };

describe('parseChaptersFromAI', () => {
  it('解析标题与细纲，order 从 startIndex 递增', () => {
    const text = '第一章：开端\n剧情细纲：主角登场\n---\n第二章 冲突\n内容：矛盾升级';
    const out = parseChaptersFromAI(text, 0, fallbacks);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ title: '开端', summary: '主角登场', order: 0 });
    expect(out[1]).toMatchObject({ title: '冲突', summary: '矛盾升级', order: 1 });
    expect(out[0]!.id).toBeTruthy();
  });

  it('细纲为空时回落默认文案', () => {
    const out = parseChaptersFromAI('第一章：标题\n剧情细纲：', 0, fallbacks);
    expect(out[0]!.title).toBe('标题');
    expect(out[0]!.summary).toBe('（无）');
  });

  it('startIndex 影响生成序号', () => {
    const out = parseChaptersFromAI('第一章：甲\n剧情细纲：A', 5, fallbacks);
    expect(out[0]!.order).toBe(5);
  });
});

describe('buildChapterContextBlock', () => {
  it('含书名、简介与人物', () => {
    const project = {
      title: '测试书', intro: '简介文', characters: [{ name: '林川', role: 'protagonist', personality: '冷静' }],
    } as unknown as Project;
    const block = buildChapterContextBlock(project);
    expect(block).toContain('书名：《测试书》');
    expect(block).toContain('简介：简介文');
    expect(block).toContain('林川');
  });
});
