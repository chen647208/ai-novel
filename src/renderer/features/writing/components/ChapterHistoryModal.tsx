/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Chapter } from '../../../../shared/types';
import { formatHistoryTimestamp, getGenerationType, getProviderIcon } from '../utils';
import { listSnapshots, removeSnapshot } from '../services/chapterSnapshotService';
import { dialogService } from '@/shared/services/dialogService';

interface ChapterHistoryModalProps {
  isOpen: boolean;
  chapter: Chapter | null | undefined;
  onClose: () => void;
  onApplyContent: (content: string) => void;
  onClearHistory: () => void;
  onUpdateChapter?: (chapter: Chapter) => void;
}

const DEFAULT_SOURCE_CLS = 'bg-gray-100 text-gray-600';
const MANUAL_SOURCE_CLS = 'bg-amber-100 text-amber-700';
const BEFORE_CLEAR_SOURCE_CLS = 'bg-red-100 text-red-700';

const ChapterHistoryModal: React.FC<ChapterHistoryModalProps> = ({
  isOpen,
  chapter,
  onClose,
  onApplyContent,
  onClearHistory,
  onUpdateChapter,
}) => {
  const { t } = useTranslation('writing');
  const [tab, setTab] = useState<'ai' | 'snapshot'>('ai');

  if (!isOpen || !chapter) {
    return null;
  }

  const sortedHistory = [...(chapter.history || [])].sort((a, b) => b.timestamp - a.timestamp);
  const snapshots = listSnapshots(chapter);
  const sourceLabels: Record<string, { text: string; cls: string }> = {
    auto: { text: t('chapterHistory.sourceAuto'), cls: DEFAULT_SOURCE_CLS },
    manual: { text: t('chapterHistory.sourceManual'), cls: MANUAL_SOURCE_CLS },
    'before-clear': { text: t('chapterHistory.sourceBeforeClear'), cls: BEFORE_CLEAR_SOURCE_CLS },
  };
  const fallbackSourceLabel = { text: t('chapterHistory.sourceAuto'), cls: DEFAULT_SOURCE_CLS };

  const handleRestoreSnapshot = (content: string) => {
    onApplyContent(content);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">{t('chapterHistory.title')}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{t('chapterHistory.chapterHeader', { num: chapter.order + 1, title: chapter.title })}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex gap-1 px-8 pt-4 shrink-0 border-b border-gray-100 bg-white">
          <button
            onClick={() => setTab('ai')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors ${tab === 'ai' ? 'bg-gray-50 text-blue-600 border border-b-0 border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <i className="fas fa-robot mr-1"></i> {t('chapterHistory.tabAI', { count: sortedHistory.length })}
          </button>
          <button
            onClick={() => setTab('snapshot')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors ${tab === 'snapshot' ? 'bg-gray-50 text-amber-600 border border-b-0 border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <i className="fas fa-camera mr-1"></i> {t('chapterHistory.tabSnapshot', { count: snapshots.length })}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
          {tab === 'snapshot' ? (
            snapshots.length > 0 ? (
              <div className="space-y-3">
                {snapshots.map((snap) => {
                  const label = sourceLabels[snap.source] ?? fallbackSourceLabel;
                  return (
                    <div key={snap.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-4 hover:shadow-md transition-all">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold shrink-0 ${label.cls}`}>{label.text}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-700">{formatHistoryTimestamp(snap.timestamp)}</div>
                          <div className="text-xs text-gray-400 truncate mt-0.5">
                            {t('chapterHistory.charCountInfo', { count: snap.charCount, preview: snap.content.slice(0, 40).replace(/\n/g, ' ') || t('chapterHistory.emptyPreview') })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRestoreSnapshot(snap.content)}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-1.5"
                          title={t('chapterHistory.restoreTitle')}
                        >
                          <i className="fas fa-rotate-left"></i> {t('chapterHistory.restore')}
                        </button>
                        {onUpdateChapter && (
                          <button
                            onClick={() => onUpdateChapter(removeSnapshot(chapter, snap.id))}
                            className="w-8 h-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                            title={t('chapterHistory.deleteSnapshotTitle')}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <i className="fas fa-camera text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-500 font-medium">{t('chapterHistory.noSnapshots')}</p>
                <p className="text-gray-400 text-sm mt-2">{t('chapterHistory.noSnapshotsHint')}</p>
              </div>
            )
          ) : sortedHistory.length > 0 ? (
            <div className="space-y-4">
              {sortedHistory.map((record) => (
                <div key={record.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-lg">
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <i className={getProviderIcon(record.modelConfig.provider)}></i>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{record.modelConfig.modelName}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">
                            {getGenerationType(record)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {record.metadata?.templateName || t('chapterHistory.customGeneration')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-700">{formatHistoryTimestamp(record.timestamp)}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {record.tokens ? `${record.tokens.total} tokens` : 'N/A tokens'}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('chapterHistory.promptLabel')}</div>
                      <div className="bg-gray-50 text-gray-700 text-sm p-4 rounded-xl border border-gray-100 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                        {record.prompt}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('chapterHistory.contentLabel')}</div>
                      <div className="bg-emerald-50/50 text-gray-800 text-sm p-4 rounded-xl border border-emerald-100 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                        {record.generatedContent}
                      </div>
                      <div className="text-xs text-gray-400 mt-2 text-right">
                        {t('chapterHistory.lengthInfo', { count: record.generatedContent.length })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('chapterHistory.modelConfigLabel')}</div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700">
                            <span className="font-bold">{t('chapterHistory.providerLabel')}</span> {record.modelConfig.provider}
                          </div>
                          {record.modelConfig.temperature !== undefined && (
                            <div className="text-sm text-gray-700">
                              <span className="font-bold">{t('chapterHistory.temperatureLabel')}</span> {record.modelConfig.temperature}
                            </div>
                          )}
                          {record.modelConfig.maxTokens !== undefined && (
                            <div className="text-sm text-gray-700">
                              <span className="font-bold">{t('chapterHistory.maxTokensLabel')}</span> {record.modelConfig.maxTokens}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('record.tokenUsage')}</div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700"><span className="font-bold">{t('chapterHistory.inputLabel')}</span> {record.tokens?.prompt || 'N/A'}</div>
                          <div className="text-sm text-gray-700"><span className="font-bold">{t('chapterHistory.outputLabel')}</span> {record.tokens?.completion || 'N/A'}</div>
                          <div className="text-sm text-gray-700"><span className="font-bold">{t('chapterHistory.totalLabel')}</span> {record.tokens?.total || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(record.generatedContent);
                          dialogService.alert(t('record.copied'));
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <i className="fas fa-copy"></i> {t('record.copyContent')}
                      </button>
                      <button
                        onClick={() => {
                          onApplyContent(record.generatedContent);
                          onClose();
                        }}
                        className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                      >
                        <i className="fas fa-redo"></i> {t('chapterHistory.reapply')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <i className="fas fa-history text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500 font-medium">{t('chapterHistory.noHistory')}</p>
              <p className="text-gray-400 text-sm mt-2">{t('chapterHistory.noHistoryHint')}</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-500">{t('chapterHistory.footerCount', { count: chapter.history?.length || 0 })}</div>
          <div className="flex gap-3">
            <button onClick={onClearHistory} className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2">
              <i className="fas fa-trash"></i> {t('chapterHistory.clearHistory')}
            </button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors">
              {t('chapterHistory.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterHistoryModal;

