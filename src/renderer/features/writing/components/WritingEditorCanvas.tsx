/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import WritingEditorStatusOverlay from './WritingEditorStatusOverlay';
import type { WritingEditorCanvasProps } from '../types';
import { cn } from '@/shared/utils/cn';

const WritingEditorCanvas: React.FC<WritingEditorCanvasProps> = ({
  textRef,
  activeChapterId,
  content,
  isFocusMode,
  isGenerating,
  isStreaming,
  isBatchGenerating,
  targetWordCount,
  selectedKnowledgeCount,
  streamingContentLength,
  batchProgress,
  onMouseUp,
  onKeyUp,
  onMouseMove,
  onContentChange,
  onStopStreaming,
  onStopBatchGeneration,
}) => {
  const { t } = useTranslation('writing');
  return (
    <div className={cn('custom-scrollbar flex flex-1 justify-center overflow-y-auto p-10 transition-colors', isFocusMode ? 'bg-background' : 'bg-muted/30')}>
      <textarea
        ref={textRef}
        disabled={!activeChapterId || (isGenerating && !isStreaming)}
        value={content}
        onMouseUp={onMouseUp}
        onKeyUp={onKeyUp}
        onMouseMove={onMouseMove}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder={activeChapterId ? t('canvas.placeholderReady') : t('canvas.placeholderEmpty')}
        className={cn(
          'h-full w-full min-h-[1200px] cursor-text resize-none rounded-lg border border-border bg-card p-16 font-serif text-lg leading-relaxed text-foreground shadow-sm outline-none',
          'selection:bg-primary/15 placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-60',
          isFocusMode ? 'max-w-3xl text-xl leading-loose' : 'max-w-4xl'
        )}
        style={{ whiteSpace: 'pre-wrap' }}
      />
      <WritingEditorStatusOverlay
        isGenerating={isGenerating}
        isStreaming={isStreaming}
        isBatchGenerating={isBatchGenerating}
        targetWordCount={targetWordCount}
        selectedKnowledgeCount={selectedKnowledgeCount}
        streamingContentLength={streamingContentLength}
        batchProgress={batchProgress}
        onStopStreaming={onStopStreaming}
        onStopBatchGeneration={onStopBatchGeneration}
      />
    </div>
  );
};

export default WritingEditorCanvas;
