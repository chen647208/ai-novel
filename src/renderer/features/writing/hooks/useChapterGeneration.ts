/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 写作编辑器 AI 生成编排（从 WritingEditor 抽出）：单章模板生成（流式/传统）、
 * 停止保留半截、重试、批量多章生成与其停止。状态与副作用集中于此，
 * 组件只负责渲染与把用户操作转成对 hook 的调用。
 */
import { useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { AIService } from '@/shared/services/ai/aiService';
import { dialogService } from '@/shared/services/dialogService';
import { logger } from '@/shared/utils/logger';
import { isModelUsable } from '@/shared/utils/modelReadiness';
import { templateDisplayName } from '@/i18n';
import {
  BATCH_CHAPTER_INTERVAL_MS,
  DEFAULT_BATCH_MODE,
  INITIAL_BATCH_PROGRESS,
  INITIAL_TOKEN_USAGE,
  SELECTION_MENU_DEBOUNCE_MS,
} from '../constants';
import type {
  AIHistoryRecord,
  Chapter,
  ModelConfig,
  OutputMode,
  Project,
  PromptTemplate,
  StreamingAIResponse,
} from '../../../../shared/types';
import type { BatchMode, BatchProgress, GenerationModalState, MenuPosition, TextSelectionRange, TokenUsage } from '../types';
import { applySelectionReplacement } from '../../../editor/commands';
import { applyGeneratedContent, applyBatchResults, generateChapterContent } from '../services/chapterGeneration';
import { buildChapterPrompt } from '../services/chapterPrompt';

interface UseChapterGenerationOptions {
  project: Project;
  activeChapter: Chapter | undefined;
  genModal: GenerationModalState;
  setGenModal: (state: GenerationModalState) => void;
  setActiveChapterId: (id: string | null) => void;
  setMenuPos: (pos: MenuPosition | null) => void;
  setEditModalOpen: (open: boolean) => void;
  selectedText: string;
  selectionRange: TextSelectionRange | null;
  setSelectionRange: (range: TextSelectionRange | null) => void;
  setSelectedText: (text: string) => void;
  selectedKnowledgeIds: Set<string>;
  selectedCharacterIds: Set<string>;
  selectedChapterSummaryIds: Set<string>;
  useOutline: boolean;
  editableSummary: string;
  targetWordCount: number;
  outputMode: OutputMode;
  activeModel: ModelConfig | undefined;
  prompts: PromptTemplate[];
  selectedGenPromptId: string;
  snapshotChapterIfDue: (chapterId: string, source: 'auto' | 'manual' | 'before-clear') => void;
  commitAIChapters: (chapters: Chapter[], template: PromptTemplate) => void;
  updateChapterContent: (text: string) => void;
  onUpdate: (updates: Partial<Project>, opts?: { agentId?: string; cause?: string }) => void;
  t: TFunction<readonly ['writing', 'steps'], undefined>;
}

export function useChapterGeneration(options: UseChapterGenerationOptions) {
  const {
    project,
    activeChapter,
    genModal,
    setGenModal,
    setActiveChapterId,
    setMenuPos,
    setEditModalOpen,
    selectedText,
    selectionRange,
    setSelectionRange,
    setSelectedText,
    selectedKnowledgeIds,
    selectedCharacterIds,
    selectedChapterSummaryIds,
    useOutline,
    editableSummary,
    targetWordCount,
    outputMode,
    activeModel,
    prompts,
    selectedGenPromptId,
    snapshotChapterIfDue,
    commitAIChapters,
    updateChapterContent,
    onUpdate,
    t,
  } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [, setStreamingResponse] = useState<StreamingAIResponse | null>(null);
  const [streamingAbortController, setStreamingAbortController] = useState<AbortController | null>(null);
  const [batchMode, setBatchMode] = useState<BatchMode>(DEFAULT_BATCH_MODE);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>(INITIAL_BATCH_PROGRESS);
  const [batchAbortController, setBatchAbortController] = useState<AbortController | null>(null);
  const [streamingTokens, setStreamingTokens] = useState<TokenUsage>(INITIAL_TOKEN_USAGE);
  const [traditionalTokens, setTraditionalTokens] = useState<TokenUsage>(INITIAL_TOKEN_USAGE);
  const [stoppedPartial, setStoppedPartial] = useState<string | null>(null);
  const lastRunRef = useRef<{ template: PromptTemplate; overrideContent?: string } | null>(null);

  const runAITemplate = async (template: PromptTemplate, overrideContent?: string) => {
    const targetChapter = genModal.chapter || activeChapter;
    if (!targetChapter) return;
    if (!isModelUsable(activeModel)) {
      dialogService.alert(t('steps:common.noModel'));
      return;
    }

    // 写前快照：AI 落笔前先保一次，失败可从快照/历史找回（定时/切章快照不覆盖此路径）。
    snapshotChapterIfDue(targetChapter.id, 'manual');
    // 记录上次执行参数：工具条重试键原样复用
    lastRunRef.current = { template, overrideContent };

    setIsGenerating(true);
    setMenuPos(null);
    setEditModalOpen(false);
    setStreamingTokens({ prompt: 0, completion: 0, total: 0 });
    setTraditionalTokens({ prompt: 0, completion: 0, total: 0 });

    if (genModal.isOpen && genModal.chapter) {
      setActiveChapterId(genModal.chapter.id);
      setGenModal({ isOpen: false, chapter: null });
    }

    const finalPrompt = buildChapterPrompt({
      template,
      project,
      targetChapter,
      context: overrideContent || selectedText || targetChapter.content,
      isModalOpen: genModal.isOpen,
      targetWordCount,
      editableSummary,
      useOutline,
      selectedKnowledgeIds,
      selectedCharacterIds,
      selectedChapterSummaryIds,
    });

    const shouldUseStreaming = outputMode === 'streaming' && activeModel.supportsStreaming !== false;

    if (shouldUseStreaming) {
      setIsStreaming(true);
      setStreamingContent('');
      setStreamingResponse(null);

      const abortController = new AbortController();
      setStreamingAbortController(abortController);

      try {
        await AIService.callStreaming(activeModel, finalPrompt, (response) => {
          setStreamingContent(response.content);
          setStreamingResponse(response);

          if (response.tokens) {
            setStreamingTokens(response.tokens);
          }

          if (response.isComplete) {
            setIsStreaming(false);
            setStreamingAbortController(null);

            if (response.error) {
              // 用户主动取消不算失败，不打扰；其余错误提示并复位生成态（'生成已取消' 为适配层控制流哨兵，保持字面比对）
              if (response.error !== '生成已取消') {
                dialogService.alert(t('editor.aiFailed', { error: response.error }));
              }
              setIsGenerating(false);
              return;
            }

            const result = response.content;
            if (selectedText && selectionRange && !genModal.isOpen) {
              const currentContent = activeChapter?.content || '';
              const newContent = applyGeneratedContent(currentContent, result, selectionRange, applySelectionReplacement);

              const historyRecord = AIService.buildHistoryRecordData(
                targetChapter.id,
                finalPrompt,
                result,
                activeModel,
                response,
                {
                  templateName: templateDisplayName(template),
                  batchGeneration: false,
                  chapterTitle: targetChapter.title,
                },
              );

              const updatedChapters = project.chapters.map(c => {
                if (c.id === targetChapter.id) {
                  const existingHistory = c.history || [];
                  return {
                    ...c,
                    content: newContent,
                    history: [...existingHistory, historyRecord],
                  };
                }
                return c;
              });
              commitAIChapters(updatedChapters, template);
            } else {
              const currentContent = targetChapter.content || '';
              const newContent = applyGeneratedContent(currentContent, result);
              const newChapters = project.chapters.map(c => {
                if (c.id === targetChapter.id) {
                  const historyRecord = AIService.buildHistoryRecordData(
                    targetChapter.id,
                    finalPrompt,
                    result,
                    activeModel,
                    response,
                    {
                      templateName: templateDisplayName(template),
                      batchGeneration: false,
                      chapterTitle: targetChapter.title,
                    },
                  );

                  const existingHistory = c.history || [];
                  return {
                    ...c,
                    content: newContent,
                    history: [...existingHistory, historyRecord],
                  };
                }
                return c;
              });
              commitAIChapters(newChapters, template);
            }

            setIsGenerating(false);
            setSelectionRange(null);
            setSelectedText('');
          }
        }, { signal: abortController.signal });
      } catch (err) {
        logger.error(err);
        setIsStreaming(false);
        setIsGenerating(false);
        setStreamingAbortController(null);
        dialogService.alert(t('editor.streamCallFailed'));
      }
    } else {
      try {
        const result = await AIService.call(activeModel, finalPrompt);

        if (result.tokens) {
          setTraditionalTokens(result.tokens);
        }

        if (selectedText && selectionRange && !genModal.isOpen) {
          const currentContent = activeChapter?.content || '';
          const newContent = applyGeneratedContent(currentContent, result.content, selectionRange, applySelectionReplacement);

          const historyRecord = AIService.buildHistoryRecordData(
            targetChapter.id,
            finalPrompt,
            result.content,
            activeModel,
            result,
            {
              templateName: templateDisplayName(template),
              batchGeneration: false,
              chapterTitle: targetChapter.title,
            },
          );

          const updatedChapters = project.chapters.map(c => {
            if (c.id === targetChapter.id) {
              const existingHistory = c.history || [];
              return {
                ...c,
                content: newContent,
                history: [...existingHistory, historyRecord],
              };
            }
            return c;
          });
          commitAIChapters(updatedChapters, template);
        } else {
          const currentContent = targetChapter.content || '';
          const newContent = applyGeneratedContent(currentContent, result.content);
          const newChapters = project.chapters.map(c => {
            if (c.id === targetChapter.id) {
              const historyRecord = AIService.buildHistoryRecordData(
                targetChapter.id,
                finalPrompt,
                result.content,
                activeModel,
                result,
                {
                  templateName: templateDisplayName(template),
                  batchGeneration: false,
                  chapterTitle: targetChapter.title,
                },
              );

              const existingHistory = c.history || [];
              return {
                ...c,
                content: newContent,
                history: [...existingHistory, historyRecord],
              };
            }
            return c;
          });
          commitAIChapters(newChapters, template);
        }
      } catch (err) {
        logger.error(err);
        dialogService.alert(t('editor.callFailed'));
      } finally {
        setIsGenerating(false);
        setSelectionRange(null);
        setSelectedText('');
      }
    }
  };

  const stopStreaming = () => {
    if (streamingAbortController) {
      streamingAbortController.abort();
      // 半截保留：不直接清空，交由用户保留/丢弃（完成态合并规则复用）
      const partial = streamingContent;
      setIsStreaming(false);
      setIsGenerating(false);
      setStreamingAbortController(null);
      setStreamingResponse(null);
      setStreamingTokens({ prompt: 0, completion: 0, total: 0 });
      setStoppedPartial(partial.trim() ? partial : null);
      if (!partial.trim()) {
        setStreamingContent('');
      }
    }
  };

  const keepStoppedPartial = () => {
    if (!stoppedPartial || !activeChapter) {
      setStoppedPartial(null);
      return;
    }
    const currentContent = activeChapter.content || '';
    const merged = applyGeneratedContent(currentContent, stoppedPartial);
    updateChapterContent(merged);
    setStoppedPartial(null);
    setStreamingContent('');
  };

  const discardStoppedPartial = () => {
    setStoppedPartial(null);
    setStreamingContent('');
  };

  const handleRetryAI = () => {
    const last = lastRunRef.current;
    if (!last || isGenerating || isStreaming || isBatchGenerating) return;
    void runAITemplate(last.template, last.overrideContent);
  };

  const generateSingleChapter = (chapter: Chapter, template: PromptTemplate, model: ModelConfig, externalSignal?: AbortSignal) =>
    generateChapterContent({
      chapter,
      template,
      model,
      prompt: buildChapterPrompt({
        template,
        project,
        targetChapter: chapter,
        context: chapter.content,
        appendContextBlock: false,
        isModalOpen: true,
        targetWordCount,
        editableSummary,
        useOutline,
        selectedKnowledgeIds,
        selectedCharacterIds,
        selectedChapterSummaryIds,
      }),
      outputMode,
      externalSignal,
      io: {
        setActiveChapterId,
        setIsStreaming,
        setStreamingContent,
        setStreamingResponse,
        setStreamingAbortController,
        setStreamingTokens,
        setTraditionalTokens,
      },
    });

  const runBatchGeneration = async () => {
    const template = prompts.find(p => p.id === selectedGenPromptId);
    if (!template || !genModal.chapter) return;
    if (!isModelUsable(activeModel)) {
      dialogService.alert(t('steps:common.noModel'));
      return;
    }

    const targetChapter = genModal.chapter;

    setIsBatchGenerating(true);
    setGenModal({ isOpen: false, chapter: null });

    const chapterCount = batchMode === 'batch5' ? 5 : 10;

    const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);

    const startIndex = sortedChapters.findIndex(c => c.id === targetChapter.id);

    const chaptersToGenerate = sortedChapters.slice(startIndex, startIndex + chapterCount);

    const abortController = new AbortController();
    setBatchAbortController(abortController);

    try {
      const chapterUpdates: Array<{ id: string; content: string; historyRecord?: AIHistoryRecord }> = [];

      for (let i = 0; i < chaptersToGenerate.length; i++) {
        if (abortController.signal.aborted) {
          break;
        }

        const chapter = chaptersToGenerate[i];
        if (!chapter) continue;

        snapshotChapterIfDue(chapter.id, 'manual');
        setBatchProgress({
          current: i + 1,
          total: chaptersToGenerate.length,
          currentChapterTitle: chapter.title,
        });

        try {
          const result = await generateSingleChapter(chapter, template, activeModel, abortController.signal);

          chapterUpdates.push({
            id: chapter.id,
            content: result.content,
            historyRecord: result.historyRecord,
          });

          await new Promise(resolve => setTimeout(resolve, BATCH_CHAPTER_INTERVAL_MS));
        } catch (err) {
          logger.error(`生成章节 ${chapter.title} 失败:`, err);
          continue;
        }
      }

      if (chapterUpdates.length > 0) {
        const newChapters = applyBatchResults(project.chapters, chapterUpdates);

        onUpdate({ chapters: newChapters }, { agentId: 'ai:writing-batch', cause: selectedGenPromptId });

        await new Promise(resolve => setTimeout(resolve, SELECTION_MENU_DEBOUNCE_MS));
      }

      dialogService.alert(t('editor.batchDone', { count: chapterUpdates.length }));
    } catch (err) {
      logger.error(err);
      dialogService.alert(t('editor.batchFailed', { error: err instanceof Error ? err.message : t('editor.unknownError') }));
    } finally {
      setIsBatchGenerating(false);
      setBatchAbortController(null);
      setBatchProgress({ current: 0, total: 0, currentChapterTitle: '' });
    }
  };

  const stopBatchGeneration = () => {
    if (batchAbortController) {
      batchAbortController.abort();
      setIsBatchGenerating(false);
      setBatchAbortController(null);
      setBatchProgress({ current: 0, total: 0, currentChapterTitle: '' });
    }
  };

  const handleModalGenerate = () => {
    if (batchMode === 'single') {
      const template = prompts.find(p => p.id === selectedGenPromptId);
      if (template) runAITemplate(template);
    } else {
      runBatchGeneration();
    }
  };

  return {
    isGenerating,
    isStreaming,
    streamingContent,
    streamingTokens,
    traditionalTokens,
    batchMode,
    setBatchMode,
    isBatchGenerating,
    batchProgress,
    stoppedPartial,
    keepStoppedPartial,
    discardStoppedPartial,
    runAITemplate,
    stopStreaming,
    handleRetryAI,
    runBatchGeneration,
    stopBatchGeneration,
    handleModalGenerate,
    canRetryAI: Boolean(lastRunRef.current) && !isGenerating && !isStreaming && !isBatchGenerating,
  };
}
