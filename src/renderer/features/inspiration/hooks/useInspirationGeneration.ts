/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 灵感生成编排（从 StepInspiration 抽出）：流式/传统两条路径、暂停/继续/停止，
 * 完成后把灵感/简介/书名/虚拟章节历史写回项目。
 */
import { useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import {
  type AIResponse,
  type ModelConfig,
  type OutputMode,
  type Project,
  type PromptTemplate,
  type StreamingAIResponse,
  type TokenUsage,
} from '../../../../shared/types';
import { VIRTUAL_CHAPTER_ORDER, KNOWLEDGE_SNIPPET_TRUNCATE } from '../../../../shared/constants/chapters';
import { AIService } from '@/shared/services/ai/aiService';
import { dialogService } from '@/shared/services/dialogService';
import { logger } from '@/shared/utils/logger';
import { isModelUsable } from '@/shared/utils/modelReadiness';
import { templateDisplayName } from '@/i18n';

const EMPTY_TOKENS: TokenUsage = { prompt: 0, completion: 0, total: 0 };

interface UseInspirationGenerationOptions {
  input: string;
  project: Project | null;
  prompts: PromptTemplate[];
  selectedPromptId: string;
  selectedKnowledgeIds: Set<string>;
  outputMode: OutputMode;
  activeModel: ModelConfig | undefined;
  onUpdate: (updates: Partial<Project>, opts?: { agentId?: string; cause?: string }) => void;
  /** 生成开始时的 UI 复位（如切回预览）。 */
  onGenerateStart: () => void;
  /** 默认书名（用于判断是否沿用现有标题）。 */
  defaultTitle: string;
  t: TFunction<['steps', 'common']>;
}

export function useInspirationGeneration({
  input,
  project,
  prompts,
  selectedPromptId,
  selectedKnowledgeIds,
  outputMode,
  activeModel,
  onUpdate,
  onGenerateStart,
  defaultTitle,
  t,
}: UseInspirationGenerationOptions) {
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingTokens, setStreamingTokens] = useState<TokenUsage>(EMPTY_TOKENS);
  const [traditionalTokens, setTraditionalTokens] = useState<TokenUsage>(EMPTY_TOKENS);
  const [isPaused, setIsPaused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const writeResult = (finalPrompt: string, finalContent: string, response: StreamingAIResponse | AIResponse) => {
    const firstLine = finalContent.split('\n')[0]?.replace(/[#*]/g, '').trim() ?? '';
    const historyRecord = AIService.buildHistoryRecordData(
      'inspiration-virtual-chapter',
      finalPrompt,
      finalContent,
      activeModel!,
      response,
      {
        templateName: templateDisplayName(prompts.find(p => p.id === selectedPromptId) ?? { name: t('steps:inspiration.defaultTemplateName') }),
        batchGeneration: false,
        chapterTitle: t('steps:inspiration.chapterTitle'),
      },
    );

    const updatedVirtualChapters = Array.isArray(project?.virtualChapters) ? project.virtualChapters : [];
    const inspirationChapter = updatedVirtualChapters.find(c => c && c.id === 'inspiration-virtual-chapter') || {
      id: 'inspiration-virtual-chapter',
      title: t('steps:inspiration.chapterTitle'),
      summary: t('steps:inspiration.historySummary'),
      content: '',
      order: VIRTUAL_CHAPTER_ORDER,
      history: [],
    };
    const existingHistory = Array.isArray(inspirationChapter.history) ? inspirationChapter.history : [];
    const updatedInspirationChapter = { ...inspirationChapter, history: [...existingHistory, historyRecord] };
    const finalVirtualChapters = updatedVirtualChapters.filter(c => c && c.id !== 'inspiration-virtual-chapter');
    finalVirtualChapters.unshift(updatedInspirationChapter);

    const currentTitle = project?.title;
    const newTitle = currentTitle && currentTitle !== defaultTitle ? currentTitle : (firstLine || t('steps:inspiration.untitledNovel'));

    onUpdate({
      inspiration: input,
      intro: finalContent,
      title: newTitle,
      virtualChapters: finalVirtualChapters,
    }, { agentId: 'ai:inspiration', cause: selectedPromptId });
  };

  const handleStreamingChunk = (response: StreamingAIResponse, finalPrompt: string) => {
    // 无模型时不该进到这里（generate 已拦截）：中途停用则复位转圈态，避免常亮卡死
    if (!isModelUsable(activeModel)) {
      setIsStreaming(false);
      setLoading(false);
      return;
    }
    // 契约：response.content 为累计全文，直接替换（旧实现按增量累加导致内容重复）
    if (response.content) {
      setStreamingContent(response.content);
    }
    if (response.tokens) {
      setStreamingTokens(response.tokens);
    }
    if (response.isComplete) {
      setIsStreaming(false);
      setLoading(false);

      // 出错时不写入项目数据，避免用空/残缺内容覆盖
      if (response.error) {
        dialogService.alert(t('steps:common.generateFailed', { error: response.error }));
        return;
      }
      writeResult(finalPrompt, response.content || streamingContentRef.current, response);
    }
  };

  // 回调里需要读取最新流式内容：用 ref 规避闭包旧值
  const streamingContentRef = useRef('');
  streamingContentRef.current = streamingContent;

  const handlePauseResume = () => {
    setIsPaused(v => !v);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setLoading(false);
    setIsPaused(false);
  };

  const generate = async () => {
    if (!input) return;
    if (!isModelUsable(activeModel)) {
      dialogService.alert(t('steps:common.noModel'));
      return;
    }

    setStreamingContent('');
    setStreamingTokens(EMPTY_TOKENS);
    setIsPaused(false);
    onGenerateStart();

    setLoading(true);
    setIsStreaming(true);

    const promptTemplate = prompts.find(p => p.id === selectedPromptId)?.content || '{inspiration}';
    let finalPrompt = promptTemplate.replace('{inspiration}', input);

    // Inject Knowledge
    if (project && project.knowledge && selectedKnowledgeIds.size > 0) {
      const kContent = project.knowledge
        .filter(k => k && selectedKnowledgeIds.has(k.id))
        .map(k => {
          const name = k.name || '未命名资料';
          const content = typeof k.content === 'string' ? k.content.substring(0, KNOWLEDGE_SNIPPET_TRUNCATE) : '';
          return `【参考资料：${name}】\n${content}`;
        })
        .join('\n\n');
      if (kContent) finalPrompt += `\n\n### 参考世界观/设定资料 (Knowledge Base)\n请务必参考以下资料进行构思：\n${kContent}`;
    }

    try {
      abortControllerRef.current = new AbortController();

      if (outputMode === 'streaming' && activeModel && activeModel.supportsStreaming !== false) {
        await AIService.callStreaming(
          activeModel,
          finalPrompt,
          (response) => handleStreamingChunk(response, finalPrompt),
          { signal: abortControllerRef.current.signal },
        );
      } else {
        const result = await AIService.call(activeModel!, finalPrompt, { signal: abortControllerRef.current.signal });
        if (result.error) {
          dialogService.alert(t('common.generateFailed', { error: result.error }));
          return;
        }
        setTraditionalTokens(result.tokens ?? EMPTY_TOKENS);
        writeResult(finalPrompt, result.content, result);
        setIsStreaming(false);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        logger.debug('流式输出已停止');
      } else {
        dialogService.alert(t('steps:inspiration.generateFailedGeneric'));
        logger.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    isStreaming,
    streamingContent,
    streamingTokens,
    traditionalTokens,
    isPaused,
    generate,
    handlePauseResume,
    handleStopStreaming,
  };
}
