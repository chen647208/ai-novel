import React from 'react';
import WritingEditorStatusOverlay from './WritingEditorStatusOverlay';
import type { WritingEditorCanvasProps } from '../types';

const WritingEditorCanvas: React.FC<WritingEditorCanvasProps> = ({
  textRef,
  activeChapterId,
  content,
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
    <div className="flex-1 overflow-y-auto p-10 flex justify-center custom-scrollbar">
      <textarea
        ref={textRef}
        disabled={!activeChapterId || (isGenerating && !isStreaming)}
        value={content}
        onMouseUp={onMouseUp}
        onKeyUp={onKeyUp}
        onMouseMove={onMouseMove}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder={activeChapterId ? '泼墨挥毫，选中文字可唤出 AI 润色工具...' : '请点击左侧目录选择章节...'}
        className="w-full max-w-4xl h-full p-16 bg-white shadow-2xl rounded-3xl border border-gray-100 outline-none text-lg text-gray-700 leading-relaxed font-serif resize-none min-h-[1200px] transition-all duration-500 selection:bg-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed cursor-text"
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
