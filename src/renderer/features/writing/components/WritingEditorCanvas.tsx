/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import WritingEditorStatusOverlay from './WritingEditorStatusOverlay';
import TipTapCanvas from './TipTapCanvas';
import type { WritingEditorCanvasProps } from '../types';
import { cn } from '@/shared/utils/cn';

const WritingEditorCanvas: React.FC<WritingEditorCanvasProps> = ({
  editorRef,
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
  return (
    <div className={cn('custom-scrollbar flex flex-1 justify-center overflow-y-auto p-10 transition-colors', isFocusMode ? 'bg-background' : 'bg-muted/30')}>
      <TipTapCanvas
        ref={editorRef}
        activeChapterId={activeChapterId}
        content={content}
        isFocusMode={isFocusMode}
        isGenerating={isGenerating}
        isStreaming={isStreaming}
        onContentChange={onContentChange}
        onMouseUp={onMouseUp}
        onKeyUp={onKeyUp}
        onMouseMove={onMouseMove}
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
