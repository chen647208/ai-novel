/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { AIService } from '@/shared/services/ai/aiService';
import type { Chapter, ModelConfig, Project, PromptTemplate } from '../../../../shared/types';
import type { CommitOptions } from '@/shared/services/repository/types';
import { dialogService } from '@/shared/services/dialogService';
import { i18n, templateDisplayName } from '@/i18n';

interface ExtractChapterSummaryArgs {
  activeChapter: Chapter | undefined;
  summaryPrompts: PromptTemplate[];
  selectedSummaryPromptId: string;
  prompts: PromptTemplate[];
  project: Project;
  activeModel: ModelConfig;
  onUpdate: (updates: Partial<Project>, opts?: CommitOptions) => void;
}

export const extractChapterSummary = async ({
  activeChapter,
  summaryPrompts,
  selectedSummaryPromptId,
  prompts,
  project,
  activeModel,
  onUpdate,
}: ExtractChapterSummaryArgs) => {
  if (!activeChapter || !activeChapter.content || activeChapter.content.trim().length === 0) {
    dialogService.alert(i18n.t('writing:summaryService.noContent'));
    return;
  }

  if (summaryPrompts.length === 0) {
    dialogService.alert(i18n.t('writing:summaryService.noPrompts'));
    return;
  }

  const selectedPromptId = selectedSummaryPromptId || summaryPrompts[0]?.id || '';
  if (!selectedPromptId) {
    dialogService.alert(i18n.t('writing:summaryService.selectPrompt'));
    return;
  }

  const template = prompts.find((prompt) => prompt.id === selectedPromptId);
  if (!template) {
    dialogService.alert(i18n.t('writing:summaryService.promptNotFound'));
    return;
  }

  let finalPrompt = template.content;
  const context = activeChapter.content;

  if (!finalPrompt.includes('{content}') && context) {
    finalPrompt += `\n\n需要处理的原文内容：\n"""\n${context}\n"""\n\n请根据上述内容进行处理。`;
  }

  finalPrompt = finalPrompt
    .replace('{content}', context)
    .replace('{title}', project.title)
    .replace('{chapter_title}', activeChapter.title)
    .replace('{summary}', activeChapter.summary)
    .replace('{inspiration}', project.inspiration);

  const result = await AIService.call(activeModel, finalPrompt);
  if (result.error) {
    dialogService.alert(i18n.t('writing:summaryService.failed', { error: result.error }));
    return;
  }

  const chaptersWithSummary = project.chapters.map((chapter) => {
    if (chapter.id !== activeChapter.id) {
      return chapter;
    }

    return {
      ...chapter,
      contentSummary: result.content,
    };
  });

  const historyRecord = AIService.buildHistoryRecordData(
    activeChapter.id,
    finalPrompt,
    result.content,
    activeModel,
    result,
    {
      templateName: templateDisplayName(template),
      batchGeneration: false,
      chapterTitle: activeChapter.title,
      operationType: 'summary_extraction',
    },
  );

  const updatedChapters = chaptersWithSummary.map((chapter) => {
    if (chapter.id !== activeChapter.id) {
      return chapter;
    }

    return {
      ...chapter,
      history: [...(chapter.history || []), historyRecord],
    };
  });

  onUpdate({ chapters: updatedChapters }, { agentId: 'ai:summary', cause: selectedPromptId });
  dialogService.alert(i18n.t('writing:summaryService.success'));
};

