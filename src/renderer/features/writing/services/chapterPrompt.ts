/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 写作编辑器：把模板 + 项目上下文拼成最终 AI 提示词（纯函数，便于单测）。
 * 含知识库/大纲/角色/前文摘要/细纲补充/前后章连贯性/伏笔承接等段落。
 */
import { buildForeshadowContextForPrompt } from '@/shared/services/foreshadowService';
import { roleLabel } from '@/shared/utils/displayLabels';

import { PROMPT_KNOWLEDGE_TRUNCATE } from '../../../../shared/constants/chapters';
import type { Chapter, Project, PromptTemplate } from '../../../../shared/types';
import { WRITING_OUTPUT_FORMAT_DIRECTIVE } from '../constants';
import { getChapterContext } from '../utils';

export interface ChapterPromptInput {
  template: PromptTemplate;
  project: Project;
  targetChapter: Chapter;
  /** 待处理原文：选区文本、覆盖内容或整章正文。 */
  context: string;
  /** 是否来自"生成章节"弹窗（决定是否附加字数要求）。 */
  isModalOpen: boolean;
  /** 模板无 {content} 时是否追加"待处理原文"块（批量生成保持旧行为传 false）。 */
  appendContextBlock?: boolean;
  targetWordCount: number;
  editableSummary: string;
  useOutline: boolean;
  selectedKnowledgeIds: Set<string>;
  selectedCharacterIds: Set<string>;
  selectedChapterSummaryIds: Set<string>;
}

export function buildChapterPrompt(input: ChapterPromptInput): string {
  const {
    template,
    project,
    targetChapter,
    context,
    isModalOpen,
    appendContextBlock,
    targetWordCount,
    editableSummary,
    useOutline,
    selectedKnowledgeIds,
    selectedCharacterIds,
    selectedChapterSummaryIds,
  } = input;

  let finalPrompt = template.content;

  const { prevChapter, prevContextText, nextChapter, nextSummary } = getChapterContext(project.chapters, targetChapter);

  const hasContentVariable = finalPrompt.includes('{content}');

  if (appendContextBlock !== false && !hasContentVariable && context) {
    finalPrompt += `\n\n需要处理的原文内容：\n"""\n${context}\n"""\n\n请根据上述内容进行处理。`;
  }

  finalPrompt = finalPrompt
    .replace('{content}', context)
    .replace('{title}', project.title)
    .replace('{chapter_title}', targetChapter.title)
    .replace('{summary}', targetChapter.summary)
    .replace('{inspiration}', project.inspiration);

  if (selectedKnowledgeIds.size > 0 && project.knowledge) {
    const knowledgeContent = project.knowledge
      .filter(k => selectedKnowledgeIds.has(k.id))
      .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, PROMPT_KNOWLEDGE_TRUNCATE)}`)
      .join('\n\n');

    if (knowledgeContent) {
      finalPrompt += `\n\n### 必须参考的背景资料 (Knowledge Base)\n请务必参考以下设定资料进行创作：\n\n${knowledgeContent}\n\n`;
    }
  }

  if (useOutline && project.outline && project.outline.trim().length > 0) {
    finalPrompt += `\n\n### 小说整体大纲 (Novel Outline)\n请严格遵循以下整体故事大纲进行创作：\n"""\n${project.outline}\n"""\n\n`;
  }

  if (selectedCharacterIds.size > 0) {
    const selectedCharacters = project.characters.filter(c => selectedCharacterIds.has(c.id));
    if (selectedCharacters.length > 0) {
      const characterInfo = selectedCharacters.map(c => {
        let info = `【角色：${c.name}】`;
        if (c.role) info += `\n- 身份/角色：${roleLabel(c.role)}`;
        if (c.personality) info += `\n- 性格特点：${c.personality}`;
        if (c.background) info += `\n- 背景故事：${c.background}`;
        if (c.appearance) info += `\n- 外貌特征：${c.appearance}`;
        if (c.relationships) info += `\n- 人际关系：${c.relationships}`;
        return info;
      }).join('\n\n');

      finalPrompt += `\n\n### 关键角色设定 (Character Settings)\n以下角色将在本章中出现，请严格遵循其设定进行描写：\n\n${characterInfo}\n\n`;
    }
  }

  if (selectedChapterSummaryIds.size > 0) {
    const selectedChapters = project.chapters
      .filter(c => selectedChapterSummaryIds.has(c.id))
      .sort((a, b) => a.order - b.order);

    if (selectedChapters.length > 0) {
      const chapterSummaries = selectedChapters.map(c => {
        return `【第${c.order + 1}章：${c.title}】\n${c.contentSummary}`;
      }).join('\n\n');

      finalPrompt += `\n\n### 前文情节摘要 (Previous Chapter Summaries)\n请参考以下前面章节的正文摘要，确保情节连贯性：\n\n${chapterSummaries}\n\n`;
    }
  }

  if (editableSummary && editableSummary.trim().length > 0) {
    finalPrompt += `\n\n### 本章细纲补充 (Enhanced Chapter Outline)\n请优先参考以下补充细纲进行创作：\n"""\n${editableSummary.trim()}\n"""\n\n`;
  }

  if (template.category !== 'edit') {
    if (prevContextText && prevContextText.length > 0) {
      finalPrompt += `\n\n### 情节连贯性要求 (Critical)\n1. **承接上文**：上一章${prevChapter ? `《${prevChapter.title}》` : ''}的结尾内容如下：\n"""\n${prevContextText}\n"""\n请务必紧接上述情节、氛围和人物状态继续描写，严禁割裂。`;
    } else {
      finalPrompt += `\n\n### 情节说明\n这是本书的第一章（或上一章暂无内容），请开始全新的叙述。`;
    }

    if (nextSummary && nextSummary.length > 0) {
      finalPrompt += `\n\n2. **铺垫下文**：下一章${nextChapter ? `《${nextChapter.title}》` : ''}的预告是：\n"${nextSummary}"\n请在本章结尾为后续发展埋下伏笔或做好铺垫。`;
    }

    finalPrompt += `\n\n### 核心指令\n重点依据本章细纲（${targetChapter.summary}）创作。请确保逻辑自洽，文笔流畅。`;

    // RAG 增强：注入截至本章仍未回收的伏笔，提醒模型承接
    finalPrompt += buildForeshadowContextForPrompt(project, targetChapter.order);
  }

  if (isModalOpen) {
    finalPrompt += `\n\n要求：请撰写约 ${targetWordCount} 字的正文内容。`;
  }

  finalPrompt += WRITING_OUTPUT_FORMAT_DIRECTIVE;

  return finalPrompt;
}
