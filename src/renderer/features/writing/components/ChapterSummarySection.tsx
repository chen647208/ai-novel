import React from 'react';
import type { ChapterSummarySectionProps } from '../types';

const ChapterSummarySection: React.FC<ChapterSummarySectionProps> = ({
  activeChapter,
  summaryPrompts,
  selectedSummaryPromptId,
  isExtractingSummary,
  onOpenSummaryPromptManager,
  onContentSummaryChange,
  onSummaryPromptChange,
  onExtractSummary,
}) => {
  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest">章节正文摘要</h4>
        <div className="flex gap-1">
          <button
            onClick={onOpenSummaryPromptManager}
            className="text-[8px] text-gray-400 hover:text-purple-500 transition-colors"
            title="管理摘要提示词"
          >
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </div>

      <textarea
        value={activeChapter?.contentSummary || ''}
        onChange={(event) => onContentSummaryChange(event.target.value)}
        placeholder="输入或编辑章节正文摘要..."
        className="w-full p-4 bg-purple-50 rounded-2xl border border-purple-100 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner mb-4 min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
      />

      <div className="space-y-3">
        <div className="flex gap-2">
          <select
            value={selectedSummaryPromptId}
            onChange={(event) => onSummaryPromptChange(event.target.value)}
            className="flex-1 bg-white border border-purple-200 text-black text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-200 cursor-pointer appearance-none"
          >
            <option value="" className="text-black">选择摘要模板</option>
            {summaryPrompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id} className="text-black">{prompt.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onExtractSummary}
          disabled={isExtractingSummary || !activeChapter?.content || activeChapter.content.trim().length === 0}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            isExtractingSummary
              ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
          }`}
        >
          {isExtractingSummary ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              提取中...
            </>
          ) : (
            <>
              <i className="fas fa-robot"></i>
              AI 提取正文摘要
            </>
          )}
        </button>

        <p className="text-[9px] text-gray-400 text-center">
          * 基于当前章节正文内容，使用AI提取摘要
        </p>
      </div>
    </section>
  );
};

export default ChapterSummarySection;
