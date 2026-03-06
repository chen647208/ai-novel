import React from 'react';
import type { ChapterNavigationSectionProps } from '../types';

const ChapterNavigationSection: React.FC<ChapterNavigationSectionProps> = ({
  chapters,
  activeChapterId,
  onChapterClick,
}) => {
  return (
    <section>
      <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3">章节导航</h4>
      <div className="space-y-1">
        {chapters
          .slice()
          .sort((firstChapter, secondChapter) => firstChapter.order - secondChapter.order)
          .map((chapter) => (
            <div
              key={chapter.id}
              onClick={() => onChapterClick(chapter)}
              className={`flex justify-between items-center group px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                activeChapterId === chapter.id ? 'bg-gray-900 text-white shadow-lg' : 'hover:bg-gray-200 text-gray-600 font-medium'
              }`}
            >
              <span className="truncate flex-1">第{chapter.order + 1}章: {chapter.title}</span>
              {activeChapterId !== chapter.id && <i className="fas fa-chevron-right opacity-0 group-hover:opacity-50 text-[10px]"></i>}
            </div>
          ))}
      </div>
    </section>
  );
};

export default ChapterNavigationSection;
