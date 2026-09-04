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
import type { Chapter } from '../../../../shared/types';
import type { ExportFormat } from '../utils';

interface ExportChapterModalProps {
  isOpen: boolean;
  chapters: Chapter[];
  selectedChapterIds: Set<string>;
  format: ExportFormat;
  onClose: () => void;
  onToggleAll: () => void;
  onToggleChapter: (chapterId: string) => void;
  onFormatChange: (format: ExportFormat) => void;
  onConfirm: () => void;
}

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string; icon: string }> = [
  { value: 'txt', label: 'TXT', icon: 'fa-align-left' },
  { value: 'md', label: 'Markdown', icon: 'fa-code' },
  { value: 'html', label: 'HTML', icon: 'fa-globe' },
];

const ExportChapterModal: React.FC<ExportChapterModalProps> = ({
  isOpen,
  chapters,
  selectedChapterIds,
  format,
  onClose,
  onToggleAll,
  onToggleChapter,
  onFormatChange,
  onConfirm,
}) => {
  const { t } = useTranslation('writing');
  if (!isOpen) {
    return null;
  }

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">{t('export.title')}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Export Novel Content</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="px-8 py-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 gap-4">
          <div className="text-sm text-gray-600 font-medium">
            {t('export.selectedBefore')}<span className="font-black text-blue-600">{selectedChapterIds.size}</span>{t('export.selectedAfter', { total: chapters.length })}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFormatChange(opt.value)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  format === opt.value ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title={t('export.exportAsTitle', { format: opt.label })}
              >
                <i className={`fas ${opt.icon}`}></i> {opt.label}
              </button>
            ))}
          </div>
          <button onClick={onToggleAll} className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
            {selectedChapterIds.size === chapters.length ? t('export.deselectAll') : t('export.selectAll')}
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/30 space-y-2 flex-1">
          {sortedChapters.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">{t('export.noChapters')}</div>
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
                      {t('export.chapterEntry', { num: chapter.order + 1, title: chapter.title })}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t('export.wordCountLabel', { count: wordLength })}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4 shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 hover:text-gray-800 transition-all">{t('export.cancel')}</button>
          <button onClick={onConfirm} className="px-8 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2">
            <i className="fas fa-file-export"></i> {t('export.confirmExport', { format: format.toUpperCase() })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportChapterModal;

