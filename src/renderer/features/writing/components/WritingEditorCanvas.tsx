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
    <div className={`flex-1 overflow-y-auto p-10 flex justify-center custom-scrollbar transition-colors duration-500 ${isFocusMode ? 'bg-neutral-100' : ''}`}>
      <textarea
        ref={textRef}
        disabled={!activeChapterId || (isGenerating && !isStreaming)}
        value={content}
        onMouseUp={onMouseUp}
        onKeyUp={onKeyUp}
        onMouseMove={onMouseMove}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder={activeChapterId ? t('canvas.placeholderReady') : t('canvas.placeholderEmpty')}
        className={`w-full h-full p-16 bg-white shadow-2xl rounded-3xl border border-gray-100 outline-none text-lg text-gray-700 leading-relaxed font-serif resize-none min-h-[1200px] transition-all duration-500 selection:bg-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed cursor-text ${isFocusMode ? 'max-w-3xl text-xl leading-loose shadow-xl' : 'max-w-4xl'}`}
        style={{ whiteSpace: 'pre-wrap', opacity: (isGenerating && !isStreaming) ? 0.6 : 1 }}
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
