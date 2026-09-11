/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 批量生成单章与结果合并（从 useChapterGeneration 抽出，便于单测）。
 * 流式/传统两条路径的落盘内容与历史记录构造集中于此，UI 状态经 io 回调回传。
 */
import { templateDisplayName } from '@/i18n';
import { AIService } from '@/shared/services/ai/aiService';

import { type AIHistoryRecord, type Chapter, type ModelConfig, type OutputMode, type StreamingAIResponse } from '../../../../shared/types';
import type { TokenUsage } from '../types';

/** 生成过程中的 UI 状态回传（组件状态 setter）。 */
export interface GenerationIo {
  setActiveChapterId: (id: string) => void;
  setIsStreaming: (value: boolean) => void;
  setStreamingContent: (content: string) => void;
  setStreamingResponse: (response: StreamingAIResponse | null) => void;
  setStreamingAbortController: (controller: AbortController | null) => void;
  setStreamingTokens: (tokens: TokenUsage) => void;
  setTraditionalTokens: (tokens: TokenUsage) => void;
}

/** 落笔内容合并：有选区走替换，否则短正文直替、长正文追加。 */
export function applyGeneratedContent(
  currentContent: string,
  result: string,
  range?: { start: number; end: number } | null,
  replace?: (current: string, start: number, end: number, next: string) => string,
): string {
  if (range && replace) return replace(currentContent, range.start, range.end, result);
  return currentContent.length < 50 ? result : `${currentContent}\n\n${result}`;
}

/** 批量结果合并回章节数组：按 id 命中者替换正文并追加历史记录。 */
export function applyBatchResults(
  chapters: Chapter[],
  updates: Array<{ id: string; content: string; historyRecord?: AIHistoryRecord }>,
): Chapter[] {
  return chapters.map((c) => {
    const update = updates.find((u) => u.id === c.id);
    if (!update) return c;
    const existingHistory = c.history || [];
    const newHistory = update.historyRecord ? [...existingHistory, update.historyRecord] : existingHistory;
    return { ...c, content: update.content, history: newHistory };
  });
}

export interface GenerateChapterParams {
  chapter: Chapter;
  template: { id: string; name: string; category?: string };
  model: ModelConfig;
  prompt: string;
  outputMode: OutputMode;
  io: GenerationIo;
  externalSignal?: AbortSignal;
}

export async function generateChapterContent({
  chapter,
  template,
  model,
  prompt,
  outputMode,
  io,
  externalSignal,
}: GenerateChapterParams): Promise<{ content: string; historyRecord?: AIHistoryRecord }> {
  io.setActiveChapterId(chapter.id);

  const shouldUseStreaming = outputMode === 'streaming' && model.supportsStreaming !== false;

  if (shouldUseStreaming) {
    io.setIsStreaming(true);
    io.setStreamingContent('');
    io.setStreamingResponse(null);

    const abortController = new AbortController();
    io.setStreamingAbortController(abortController);
    // 批量停止信号联动本次请求
    if (externalSignal) {
      if (externalSignal.aborted) abortController.abort();
      else externalSignal.addEventListener('abort', () => abortController.abort(), { once: true });
    }

    return new Promise<{ content: string; historyRecord?: AIHistoryRecord }>((resolve, reject) => {
      AIService.callStreaming(model, prompt, (response) => {
        io.setStreamingContent(response.content);
        io.setStreamingResponse(response);

        if (response.tokens) {
          io.setStreamingTokens(response.tokens);
        }

        if (response.isComplete) {
          io.setIsStreaming(false);
          io.setStreamingAbortController(null);

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          const result = response.content;
          const content = applyGeneratedContent(chapter.content || '', result);
          const historyRecord = AIService.buildHistoryRecordData(
            chapter.id,
            prompt,
            result,
            model,
            response,
            {
              templateName: templateDisplayName(template as never),
              batchGeneration: true,
              chapterTitle: chapter.title,
            },
          );

          resolve({ content, historyRecord });
        }
      }, { signal: abortController.signal }).catch(reject);
    });
  }

  const result = await AIService.call(model, prompt, { signal: externalSignal });

  if (result.tokens) {
    io.setTraditionalTokens(result.tokens);
  }

  const content = applyGeneratedContent(chapter.content || '', result.content);
  const historyRecord = AIService.buildHistoryRecordData(
    chapter.id,
    prompt,
    result.content,
    model,
    result,
    {
      templateName: templateDisplayName(template as never),
      batchGeneration: true,
      chapterTitle: chapter.title,
    },
  );

  return { content, historyRecord };
}
