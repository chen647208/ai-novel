import React from 'react';
import type { WritingEditorToolbarProps } from '../types';

const WritingEditorToolbar: React.FC<WritingEditorToolbarProps> = ({
  activeChapterId,
  activeChapterTitle,
  hasProjectChapters,
  hasActiveChapterHistory,
  isSidebarOpen,
  isGlobalHistorySidebarOpen,
  wordCount,
  lastSaved,
  onBack,
  onTitleChange,
  onOpenExport,
  onClearContent,
  onToggleGlobalHistory,
  onOpenChapterHistory,
  onOpenSidebar,
}) => {
  return (
    <div className="border-b px-10 py-5 flex justify-between items-center bg-white sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-all">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">正在撰写</span>
          {activeChapterId ? (
            <input
              className="text-2xl font-black border-none focus:ring-0 w-96 p-0 text-gray-800 placeholder-gray-200 bg-transparent"
              value={activeChapterTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="输入章节标题..."
            />
          ) : (
            <span className="text-2xl font-black text-gray-300">请选择章节</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6">
        {hasProjectChapters && (
          <button onClick={onOpenExport} className="text-gray-300 hover:text-emerald-500 transition-colors flex items-center gap-2 text-xs font-bold mr-4" title="导出小说正文">
            <i className="fas fa-file-export"></i> 导出TXT
          </button>
        )}
        {activeChapterId && (
          <button onClick={onClearContent} className="text-gray-300 hover:text-red-500 transition-colors flex items-center gap-2 text-xs font-bold mr-2" title="清空当前章节正文">
            <i className="fas fa-eraser"></i> 清空正文
          </button>
        )}
        <button
          onClick={onToggleGlobalHistory}
          className={`text-gray-300 hover:text-blue-500 transition-colors flex items-center gap-2 text-xs font-bold mr-2 ${isGlobalHistorySidebarOpen ? 'text-blue-500' : ''}`}
          title="全局AI历史记录"
        >
          <i className="fas fa-history"></i> 全局历史
        </button>
        {activeChapterId && hasActiveChapterHistory && (
          <button
            onClick={onOpenChapterHistory}
            className="text-gray-300 hover:text-purple-500 transition-colors flex items-center gap-2 text-xs font-bold mr-2"
            title="查看当前章节AI生成历史记录"
          >
            <i className="fas fa-file-alt"></i> 章节历史
          </button>
        )}
        {!isSidebarOpen && (
          <button onClick={onOpenSidebar} className="w-10 h-10 rounded-2xl bg-white shadow-lg border border-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-all">
            <i className="fas fa-angle-double-right"></i>
          </button>
        )}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">字数: <span className="text-gray-900">{wordCount}</span></span>
          <span className="text-[9px] text-gray-300 font-medium mt-0.5 italic">自动保存: {new Date(lastSaved).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default WritingEditorToolbar;
