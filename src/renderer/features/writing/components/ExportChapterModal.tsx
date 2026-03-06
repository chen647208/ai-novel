import React from 'react';
import type { Chapter } from '../../../../shared/types';

interface ExportChapterModalProps {
  isOpen: boolean;
  chapters: Chapter[];
  selectedChapterIds: Set<string>;
  onClose: () => void;
  onToggleAll: () => void;
  onToggleChapter: (chapterId: string) => void;
  onConfirm: () => void;
}

const ExportChapterModal: React.FC<ExportChapterModalProps> = ({
  isOpen,
  chapters,
  selectedChapterIds,
  onClose,
  onToggleAll,
  onToggleChapter,
  onConfirm,
}) => {
  if (!isOpen) {
    return null;
  }

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">导出小说正文</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Export Novel Content</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="px-8 py-4 bg-white border-b border-gray-50 flex justify-between items-center shrink-0">
          <div className="text-sm text-gray-600 font-medium">
            已选择 <span className="font-black text-blue-600">{selectedChapterIds.size}</span> / {chapters.length} 章
          </div>
          <button onClick={onToggleAll} className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
            {selectedChapterIds.size === chapters.length ? '取消全选' : '全部选择'}
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/30 space-y-2 flex-1">
          {sortedChapters.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">暂无章节可导出</div>
          ) : (
            sortedChapters.map((chapter) => {
              const isSelected = selectedChapterIds.has(chapter.id);
              const wordLength = (chapter.content || '').length;

              return (
                <div
                  key={chapter.id}
                  onClick={() => onToggleChapter(chapter.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'}`}>
                    {isSelected && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                      第{chapter.order + 1}章：{chapter.title}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">字数：{wordLength}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4 shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 hover:text-gray-800 transition-all">取消</button>
          <button onClick={onConfirm} className="px-8 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2">
            <i className="fas fa-file-export"></i> 确认导出TXT
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportChapterModal;

