/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { buildChapterPrompt, type ChapterPromptInput } from '../chapterPrompt';
import type { Project, Chapter, PromptTemplate } from '@shared/types';

function chapter(overrides: Partial<Chapter>): Chapter {
  return {
    id: 'c', title: '章', order: 0, summary: '细纲', content: '', contentSummary: '',
    ...overrides,
  } as Chapter;
}

function baseInput(overrides: Partial<ChapterPromptInput> = {}): ChapterPromptInput {
  const chapters = [
    chapter({ id: 'c1', title: '第一章', order: 0, content: '开头', contentSummary: '摘要一' }),
    chapter({ id: 'c2', title: '第二章', order: 1, content: '正文', contentSummary: '摘要二' }),
  ];
  const project = {
    id: 'p', title: '测试书', inspiration: '灵感', intro: '', outline: '', knowledge: [], characters: [],
    chapters,
  } as unknown as Project;
  return {
    template: { id: 't', name: '模板', content: '请写 {title} 的 {chapter_title}\\n{content}', category: 'writing' } as PromptTemplate,
    project,
    targetChapter: chapters[1]!,
    context: '待处理原文',
    isModalOpen: true,
    targetWordCount: 800,
    editableSummary: '',
    useOutline: false,
    selectedKnowledgeIds: new Set(),
    selectedCharacterIds: new Set(),
    selectedChapterSummaryIds: new Set(),
    ...overrides,
  };
}

describe('buildChapterPrompt', () => {
  it('替换书名/章节标题/content，并附加字数要求', () => {
    const prompt = buildChapterPrompt(baseInput());
    expect(prompt).toContain('请写 测试书 的 第二章');
    expect(prompt).toContain('待处理原文');
    expect(prompt).toContain('约 800 字');
  });

  it('知识库选中时注入背景资料段', () => {
    const project = baseInput().project as unknown as Project;
    (project as { knowledge: unknown }).knowledge = [{ id: 'k1', name: '设定', type: 'note', content: '内容' }];
    const prompt = buildChapterPrompt(baseInput({ project, selectedKnowledgeIds: new Set(['k1']) }));
    expect(prompt).toContain('Knowledge Base');
    expect(prompt).toContain('设定');
  });

  it('edit 类模板不注入前后章连贯性/伏笔段', () => {
    const prompt = buildChapterPrompt(baseInput({
      template: { id: 'e', name: '润色', content: '润色{content}', category: 'edit' } as PromptTemplate,
    }));
    expect(prompt).not.toContain('情节连贯性要求');
  });
});
