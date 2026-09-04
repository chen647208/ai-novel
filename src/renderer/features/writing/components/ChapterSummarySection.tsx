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
import { templateDisplayName } from '@/i18n';
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
  const { t } = useTranslation('writing');
  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{t('summarySection.title')}</h4>
        <div className="flex gap-1">
          <button
            onClick={onOpenSummaryPromptManager}
            className="text-[8px] text-gray-400 hover:text-purple-500 transition-colors"
            title={t('summarySection.manageTitle')}
          >
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </div>

      <textarea
        value={activeChapter?.contentSummary || ''}
        onChange={(event) => onContentSummaryChange(event.target.value)}
        placeholder={t('summarySection.placeholder')}
        className="w-full p-4 bg-purple-50 rounded-2xl border border-purple-100 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner mb-4 min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
      />

      <div className="space-y-3">
        <div className="flex gap-2">
          <select
            value={selectedSummaryPromptId}
            onChange={(event) => onSummaryPromptChange(event.target.value)}
            className="flex-1 bg-white border border-purple-200 text-black text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-200 cursor-pointer appearance-none"
          >
            <option value="" className="text-black">{t('summarySection.selectTemplate')}</option>
            {summaryPrompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id} className="text-black">{templateDisplayName(prompt)}</option>
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
              {t('summarySection.extracting')}
            </>
          ) : (
            <>
              <i className="fas fa-robot"></i>
              {t('summarySection.extractBtn')}
            </>
          )}
        </button>

        <p className="text-[9px] text-gray-400 text-center">
          {t('summarySection.hint')}
        </p>
      </div>
    </section>
  );
};

export default ChapterSummarySection;
