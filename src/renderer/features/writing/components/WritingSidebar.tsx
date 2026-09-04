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
import { roleLabel } from '../../characters/displayLabels';
import ChapterNavigationSection from './ChapterNavigationSection';
import ChapterSummarySection from './ChapterSummarySection';
import type { WritingSidebarProps } from '../types';
import { ChevronsLeft } from 'lucide-react';

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
  const { t } = useTranslation('writing');
  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col h-full animate-in slide-in-from-left duration-300">
      <div className="p-4 border-b bg-gray-100 flex justify-between items-center">
        <h3 className="font-black text-gray-700 text-sm tracking-tight">{t('sidebar.title')}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <ChevronsLeft className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <section>
          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">{t('sidebar.charactersTitle')}</h4>
          {characters.length === 0 ? (
            <p className="text-xs text-gray-400 italic">{t('sidebar.noCharacters')}</p>
          ) : (
            characters.map((character) => (
              <div key={character.id} className="mb-3 p-3 bg-white rounded-xl border border-gray-200 text-sm shadow-sm hover:border-blue-100 transition-colors">
                <div className="font-bold text-gray-800 flex justify-between items-center">
                  {character.name}
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-gray-50 rounded border text-gray-400 uppercase">{roleLabel(character.role)}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-2 line-clamp-3 leading-relaxed italic">
                  {character.personality || character.background}
                </div>
              </div>
            ))
          )}
        </section>

        <section>
          <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">{t('sidebar.outlineTitle')}</h4>
          <textarea
            value={activeChapter?.summary || ''}
            onChange={(event) => onChapterSummaryChange(event.target.value)}
            placeholder={t('sidebar.outlinePlaceholder')}
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
