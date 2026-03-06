import React from 'react';
import type { WritingEditorStatusOverlayProps } from '../types';

const WritingEditorStatusOverlay: React.FC<WritingEditorStatusOverlayProps> = ({
  isGenerating,
  isStreaming,
  isBatchGenerating,
  targetWordCount,
  selectedKnowledgeCount,
  streamingContentLength,
  batchProgress,
  onStopStreaming,
  onStopBatchGeneration,
}) => {
  return (
    <>
      {isGenerating && !isStreaming && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-black text-xs tracking-widest uppercase">AI 正在斟酌文字...</p>
            <p className="text-gray-400 text-[10px] mt-2">预计字数: {targetWordCount}</p>
            <p className="text-gray-300 text-[9px] mt-1">已注入上下文 (包括{selectedKnowledgeCount}个知识库文件)</p>
          </div>
        </div>
      )}

      {isStreaming && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-green-600 font-black text-xs tracking-widest uppercase">AI 正在实时生成...</p>
            <p className="text-gray-400 text-[10px] mt-2">已生成: {streamingContentLength} 字</p>
            <p className="text-gray-300 text-[9px] mt-1">流式输出模式中，内容实时显示</p>
            <button
              onClick={onStopStreaming}
              className="mt-4 px-4 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-stop"></i> 停止生成
            </button>
          </div>
        </div>
      )}

      {isBatchGenerating && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in duration-300 max-w-md">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-black text-xs tracking-widest uppercase">批量生成进行中...</p>

            <div className="w-full mt-4 mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-700">
                  正在生成：第 {batchProgress.current} / {batchProgress.total} 章
                </span>
                <span className="text-xs text-gray-500">
                  {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>

            <p className="text-gray-600 text-sm font-bold mt-3 mb-1">
              {batchProgress.currentChapterTitle}
            </p>
            <p className="text-gray-400 text-[10px]">当前章节</p>

            <button
              onClick={onStopBatchGeneration}
              className="mt-6 px-6 py-3 bg-red-100 text-red-600 text-sm font-bold rounded-xl hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-stop"></i> 停止批量生成
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default WritingEditorStatusOverlay;
