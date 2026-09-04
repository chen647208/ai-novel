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
import type { WritingEditorToolbarProps } from '../types';
import { formatCharCount } from '../services/writingStatsService';

const WritingEditorToolbar: React.FC<WritingEditorToolbarProps> = ({
  activeChapterId,
  activeChapterTitle,
  hasProjectChapters,
  hasActiveChapterHistory,
  isSidebarOpen,
  isGlobalHistorySidebarOpen,
  chapterStats,
  bookStats,
  snapshotCount,
  openForeshadowCount,
  overdueForeshadowCount,
  isFocusMode,
  lastSaved,
  onBack,
  onTitleChange,
  onOpenExport,
  onOpenForeshadow,
  onClearContent,
  onToggleGlobalHistory,
  onOpenChapterHistory,
  onOpenSidebar,
  onToggleFocusMode,
  onManualSnapshot,
}) => {
  const { t, i18n } = useTranslation('writing');
  return (
    <div className={`border-b px-10 py-5 flex justify-between items-center sticky top-0 z-10 transition-colors ${isFocusMode ? 'bg-gray-50/80 border-gray-200/50' : 'bg-white'}`}>
      <div className="flex items-center gap-6">
        {!isFocusMode && (
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-all" title={t('toolbar.back')}>
            <i className="fas fa-arrow-left"></i>
          </button>
        )}
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{t('toolbar.writingLabel')}</span>
          {activeChapterId ? (
            <input
              className={`text-2xl font-black border-none focus:ring-0 p-0 placeholder-gray-200 bg-transparent ${isFocusMode ? 'w-[60ch] text-gray-700' : 'w-96 text-gray-800'}`}
              value={activeChapterTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={t('toolbar.titlePlaceholder')}
            />
          ) : (
            <span className="text-2xl font-black text-gray-300">{t('toolbar.selectChapter')}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* 统计信息：本章 + 全书 + 今日 */}
        <div className="hidden lg:flex items-center gap-3 text-[10px] font-bold text-gray-400 mr-1" title={t('toolbar.statsTitle', { paragraphs: chapterStats.paragraphs, sentences: chapterStats.sentences, minutes: chapterStats.readingMinutes })}>
          <span>{t('toolbar.thisChapter')}<span className="text-gray-900 text-xs">{formatCharCount(chapterStats.charCount)}</span></span>
          <span className="text-gray-200">|</span>
          <span>{t('toolbar.wholeBook')}<span className="text-gray-900 text-xs">{formatCharCount(bookStats.totalCharCount)}</span></span>
          {bookStats.todayCharCount > 0 && (
            <>
              <span className="text-gray-200">|</span>
              <span className="text-emerald-600">{t('toolbar.todayAdded', { count: formatCharCount(bookStats.todayCharCount) })}</span>
            </>
          )}
        </div>

        {!isFocusMode && (
          <>
            {activeChapterId && (
              <button onClick={onManualSnapshot} className="text-gray-300 hover:text-amber-500 transition-colors flex items-center gap-2 text-xs font-bold" title={t('toolbar.snapshotTitle', { count: snapshotCount })}>
                <i className="fas fa-camera"></i> {t('toolbar.snapshot')}
              </button>
            )}
            {hasProjectChapters && (
              <button onClick={onOpenExport} className="text-gray-300 hover:text-emerald-500 transition-colors flex items-center gap-2 text-xs font-bold" title={t('toolbar.exportTitle')}>
                <i className="fas fa-file-export"></i> {t('toolbar.export')}
              </button>
            )}
            <button
              onClick={onOpenForeshadow}
              className={`transition-colors flex items-center gap-1.5 text-xs font-bold ${overdueForeshadowCount > 0 ? 'text-red-500 hover:text-red-600' : 'text-gray-300 hover:text-indigo-500'}`}
              title={overdueForeshadowCount > 0 ? t('toolbar.foreshadowTitleOverdue', { open: openForeshadowCount, overdue: overdueForeshadowCount }) : t('toolbar.foreshadowTitle', { open: openForeshadowCount })}
            >
              <i className="fas fa-seedling"></i> {t('toolbar.foreshadow')}
              {openForeshadowCount > 0 && (
                <span className={`text-[9px] px-1.5 rounded-full ${overdueForeshadowCount > 0 ? 'bg-red-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>{openForeshadowCount}</span>
              )}
            </button>
            {activeChapterId && (
              <button onClick={onClearContent} className="text-gray-300 hover:text-red-500 transition-colors flex items-center gap-2 text-xs font-bold" title={t('toolbar.clearTitle')}>
                <i className="fas fa-eraser"></i> {t('toolbar.clear')}
              </button>
            )}
            <button
              onClick={onToggleGlobalHistory}
              className={`text-gray-300 hover:text-blue-500 transition-colors flex items-center gap-2 text-xs font-bold ${isGlobalHistorySidebarOpen ? 'text-blue-500' : ''}`}
              title={t('toolbar.globalHistoryTitle')}
            >
              <i className="fas fa-history"></i> {t('toolbar.globalHistory')}
            </button>
            {activeChapterId && hasActiveChapterHistory && (
              <button
                onClick={onOpenChapterHistory}
                className="text-gray-300 hover:text-purple-500 transition-colors flex items-center gap-2 text-xs font-bold"
                title={t('toolbar.chapterHistoryTitle')}
              >
                <i className="fas fa-file-alt"></i> {t('toolbar.chapterHistory')}
              </button>
            )}
          </>
        )}
        <button
          onClick={onToggleFocusMode}
          className={`flex items-center gap-2 text-xs font-bold transition-colors ${isFocusMode ? 'text-blue-600' : 'text-gray-300 hover:text-blue-500'}`}
          title={isFocusMode ? t('toolbar.exitFocusTitle') : t('toolbar.enterFocusTitle')}
        >
          <i className={`fas ${isFocusMode ? 'fa-compress' : 'fa-expand'}`}></i> {isFocusMode ? t('toolbar.exitFocus') : t('toolbar.focus')}
        </button>
        {!isSidebarOpen && !isFocusMode && (
          <button onClick={onOpenSidebar} className="w-10 h-10 rounded-2xl bg-white shadow-lg border border-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-all">
            <i className="fas fa-angle-double-right"></i>
          </button>
        )}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('toolbar.charCountLabel')}<span className="text-gray-900">{chapterStats.charCount}</span></span>
          <span className="text-[9px] text-gray-300 font-medium mt-0.5 italic">{t('toolbar.autoSave', { time: new Date(lastSaved).toLocaleTimeString(i18n.language) })}</span>
        </div>
      </div>
    </div>
  );
};

export default WritingEditorToolbar;
