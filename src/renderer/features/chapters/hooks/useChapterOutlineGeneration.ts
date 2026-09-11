/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 章节细纲生成（从 StepChapterOutline 抽出）：全量/续写两种模式，
 * 结果按 order 合并（保留既有正文/历史/快照），并写回虚拟章节历史。
 */
import { useState } from 'react';
import type { TFunction } from 'i18next';
import {
  type Chapter,
  type ModelConfig,
  type Project,
  type PromptTemplate,
  type TokenUsage,
} from '../../../../shared/types';
import { VIRTUAL_CHAPTER_ORDER, KNOWLEDGE_SNIPPET_TRUNCATE } from '../../../../shared/constants/chapters';
import { AIService } from '@/shared/services/ai/aiService';
import { dialogService } from '@/shared/services/dialogService';
import { logger } from '@/shared/utils/logger';
import { isModelUsable } from '@/shared/utils/modelReadiness';
import { templateDisplayName } from '@/i18n';
import { parseChaptersFromAI, buildChapterContextBlock } from '../services/chapterOutline';

const EMPTY_TOKENS: TokenUsage = { prompt: 0, completion: 0, total: 0 };

interface UseChapterOutlineGenerationOptions {
  project: Project;
  prompts: PromptTemplate[];
  selectedPromptId: string;
  selectedKnowledgeIds: Set<string>;
  activeModel: ModelConfig | undefined;
  onUpdate: (updates: Partial<Project>, opts?: { agentId?: string; cause?: string }) => void;
  t: TFunction<['steps', 'common']>;
}

export function useChapterOutlineGeneration({
  project,
  prompts,
  selectedPromptId,
  selectedKnowledgeIds,
  activeModel,
  onUpdate,
  t,
}: UseChapterOutlineGenerationOptions) {
  const [loading, setLoading] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [traditionalTokens, setTraditionalTokens] = useState<TokenUsage>(EMPTY_TOKENS);

  const generateChapters = async (isContinue: boolean = false) => {
    if (!project.outline) {
      dialogService.alert(t('steps:chapters.noOutline'));
      return;
    }
    if (!isModelUsable(activeModel)) {
      dialogService.alert(t('steps:common.noModel'));
      return;
    }

    setTraditionalTokens(EMPTY_TOKENS);

    if (isContinue) setContinueLoading(true);
    else setLoading(true);

    try {
      let finalPrompt = '';
      const template = prompts.find(p => p.id === selectedPromptId)?.content || '';

      if (isContinue && project.chapters.length > 0) {
        const existingInfo = project.chapters
          .slice(-5)
          .map(c => `第${c.order + 1}章：${c.title}\n细纲：${c.summary.substring(0, 100)}...`)
          .join('\n\n');

        const continueTemplate = prompts.find(p => p.id === 'p4-continue')?.content
          || "根据大纲：{outline}。目前已完成到第{count}章。请紧接着从'第{next_count}章'开始续写后续章节细纲。格式：\n第N章：[标题]\n剧情细纲：[描述]\n---";

        finalPrompt = continueTemplate
          .replace('{outline}', project.outline)
          .replace('{count}', project.chapters.length.toString())
          .replace('{next_count}', (project.chapters.length + 1).toString())
          .replace('{existing_chapters}', existingInfo)
          + buildChapterContextBlock(project);
      } else {
        finalPrompt = template.replace('{outline}', project.outline);
        finalPrompt += buildChapterContextBlock(project);
      }

      // Inject Knowledge
      if (selectedKnowledgeIds.size > 0) {
        const kContent = project.knowledge
          .filter(k => selectedKnowledgeIds.has(k.id))
          .map(k => `【参考资料：${k.name}】\n${k.content.substring(0, KNOWLEDGE_SNIPPET_TRUNCATE)}`)
          .join('\n\n');
        if (kContent) finalPrompt += `\n\n### 必须参考的世界观/设定资料 (Knowledge Base)\n请参考以下资料规划章节剧情：\n${kContent}`;
      }

      const result = await AIService.call(activeModel!, finalPrompt);
      if (result.error) {
        dialogService.alert(t('steps:common.generateFailed', { error: result.error }));
        return;
      }
      const startIndex = isContinue ? project.chapters.length : 0;
      const parsedChapters = parseChaptersFromAI(result.content, startIndex, {
        titleFor: (num) => t('steps:chapters.defaultChapterTitle', { num }),
        defaultSummary: t('steps:chapters.defaultSummary'),
      });

      if (parsedChapters.length > 0) {
        if (isContinue) {
          onUpdate({ chapters: [...project.chapters, ...parsedChapters] }, { agentId: 'ai:chapters', cause: selectedPromptId });
        } else {
          // 全量生成按 order 合并：既有章节的正文/历史/快照/摘要原位保留，只更新标题与细纲；
          // 超出 AI 输出范围的既有章节保留（防丢手写章）
          const prevByOrder = new Map(project.chapters.map((c) => [c.order, c]));
          const merged = parsedChapters.map((pc) => {
            const prev = prevByOrder.get(pc.order);
            return prev
              ? { ...pc, id: prev.id, content: prev.content, history: prev.history, snapshots: prev.snapshots, contentSummary: prev.contentSummary }
              : pc;
          });
          const kept: Chapter[] = project.chapters.filter((c) => !merged.some((m) => m.order === c.order));
          onUpdate(
            { chapters: [...merged, ...kept].sort((a, b) => a.order - b.order) },
            { agentId: 'ai:chapters', cause: selectedPromptId },
          );
        }
      } else {
        dialogService.alert(t('steps:chapters.unrecognized'));
      }

      if (result.tokens) {
        setTraditionalTokens(result.tokens);
      }

      const historyRecord = AIService.buildHistoryRecordData(
        'chapter-outline-virtual-chapter',
        finalPrompt,
        result.content,
        activeModel!,
        result,
        {
          templateName: templateDisplayName(prompts.find(p => p.id === selectedPromptId) ?? { name: t('steps:chapters.defaultTemplateName') }),
          batchGeneration: false,
          chapterTitle: isContinue ? t('steps:chapters.chapterTitleContinue') : t('steps:chapters.chapterTitleGen'),
          generatedChapterCount: parsedChapters.length,
        },
      );

      const updatedVirtualChapters = project.virtualChapters || [];
      const chapterOutlineChapter = updatedVirtualChapters.find(c => c.id === 'chapter-outline-virtual-chapter') || {
        id: 'chapter-outline-virtual-chapter',
        title: t('steps:chapters.chapterTitleGen'),
        summary: t('steps:chapters.historySummary'),
        content: '',
        order: VIRTUAL_CHAPTER_ORDER,
        history: [],
      };
      const existingHistory = chapterOutlineChapter.history || [];
      const updatedChapterOutlineChapter = { ...chapterOutlineChapter, history: [...existingHistory, historyRecord] };
      const finalVirtualChapters = updatedVirtualChapters.filter(c => c.id !== 'chapter-outline-virtual-chapter');
      finalVirtualChapters.unshift(updatedChapterOutlineChapter);

      onUpdate({ virtualChapters: finalVirtualChapters }, { agentId: 'ai:chapters', cause: selectedPromptId });
    } catch (err) {
      logger.error(err);
      dialogService.alert(t('steps:chapters.generateErrorGeneric'));
    } finally {
      setLoading(false);
      setContinueLoading(false);
    }
  };

  return { loading, continueLoading, traditionalTokens, generateChapters };
}
