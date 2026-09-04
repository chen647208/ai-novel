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
import type { ChapterNavigationSectionProps } from '../types';

const ChapterNavigationSection: React.FC<ChapterNavigationSectionProps> = ({
  chapters,
  activeChapterId,
  onChapterClick,
}) => {
  const { t } = useTranslation('writing');
  return (
    <section>
      <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3">{t('navigation.title')}</h4>
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
              <span className="truncate flex-1">{t('navigation.chapterEntry', { num: chapter.order + 1, title: chapter.title })}</span>
              {activeChapterId !== chapter.id && <i className="fas fa-chevron-right opacity-0 group-hover:opacity-50 text-[10px]"></i>}
            </div>
          ))}
      </div>
    </section>
  );
};

export default ChapterNavigationSection;
