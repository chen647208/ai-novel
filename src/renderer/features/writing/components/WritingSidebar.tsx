import React from 'react';
import ChapterNavigationSection from './ChapterNavigationSection';
import ChapterSummarySection from './ChapterSummarySection';
import type { WritingSidebarProps } from '../types';

const WritingSidebar: React.FC<WritingSidebarProps> = ({
  characters,
  activeChapter,
  activeChapterId,
  chapters,
  summaryPrompts,
  selectedSummaryPromptId,
  isExtractingSummary,
  onClose,
  onChapterSummaryChange,
  onOpenSummaryPromptManager,
  onContentSummaryChange,
  onSummaryPromptChange,
  onExtractSummary,
  onChapterClick,
}) => {
  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col h-full animate-in slide-in-from-left duration-300">
      <div className="p-4 border-b bg-gray-100 flex justify-between items-center">
        <h3 className="font-black text-gray-700 text-sm tracking-tight">创作参考面板</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <i className="fas fa-angle-double-left"></i>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <section>
          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">关键角色设定</h4>
          {characters.length === 0 ? (
            <p className="text-xs text-gray-400 italic">暂无角色信息</p>
          ) : (
            characters.map((character) => (
              <div key={character.id} className="mb-3 p-3 bg-white rounded-xl border border-gray-200 text-sm shadow-sm hover:border-blue-100 transition-colors">
                <div className="font-bold text-gray-800 flex justify-between items-center">
                  {character.name}
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-gray-50 rounded border text-gray-400 uppercase">{character.role}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-2 line-clamp-3 leading-relaxed italic">
                  {character.personality || character.background}
                </div>
              </div>
            ))
          )}
        </section>

        <section>
          <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">本章细纲参考</h4>
          <textarea
            value={activeChapter?.summary || ''}
            onChange={(event) => onChapterSummaryChange(event.target.value)}
            placeholder="输入或编辑本章细纲..."
            className="w-full p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner mb-4 min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
          />
        </section>

        <ChapterSummarySection
          activeChapter={activeChapter}
          summaryPrompts={summaryPrompts}
          selectedSummaryPromptId={selectedSummaryPromptId}
          isExtractingSummary={isExtractingSummary}
          onOpenSummaryPromptManager={onOpenSummaryPromptManager}
          onContentSummaryChange={onContentSummaryChange}
          onSummaryPromptChange={onSummaryPromptChange}
          onExtractSummary={onExtractSummary}
        />

        <ChapterNavigationSection
          chapters={chapters}
          activeChapterId={activeChapterId}
          onChapterClick={onChapterClick}
        />
      </div>
    </div>
  );
};

export default WritingSidebar;
