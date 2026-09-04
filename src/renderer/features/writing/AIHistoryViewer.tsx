/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dialogService } from '@/shared/services/dialogService';
import AIHistoryRecordList from './components/history/AIHistoryRecordList';
import { toggleSetValue } from './utils';
import type {
  AIHistoryRecordWithChapter,
  AIHistorySortBy,
  AIHistorySortOrder,
  AIHistoryViewerProps,
  AIHistoryViewMode,
} from './types';

const AIHistoryViewer: React.FC<AIHistoryViewerProps> = ({ project, onUpdate, onClose, mode = 'modal' }) => {
  const { t } = useTranslation('writing');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<AIHistoryViewMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<AIHistorySortBy>('timestamp');
  const [sortOrder, setSortOrder] = useState<AIHistorySortOrder>('desc');

  const allHistoryRecords = useMemo<AIHistoryRecordWithChapter[]>(() => {
    const records: AIHistoryRecordWithChapter[] = [];

    project.chapters.forEach((chapter) => {
      if (chapter.history?.length) {
        chapter.history.forEach((record) => {
          records.push({ record, chapter });
        });
      }
    });

    project.virtualChapters?.forEach((chapter) => {
      if (chapter.history?.length) {
        chapter.history.forEach((record) => {
          records.push({ record, chapter });
        });
      }
    });

    return records;
  }, [project.chapters, project.virtualChapters]);

  const filteredHistoryRecords = useMemo(() => {
    let filtered = [...allHistoryRecords];

    if (viewMode === 'chapter' && selectedChapterId) {
      filtered = filtered.filter((item) => item.chapter.id === selectedChapterId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.record.prompt.toLowerCase().includes(query)
        || item.record.generatedContent.toLowerCase().includes(query)
        || item.chapter.title.toLowerCase().includes(query)
        || item.record.modelConfig.modelName.toLowerCase().includes(query)
        || (item.record.metadata?.templateName?.toLowerCase() || '').includes(query),
      );
    }

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'model':
          aValue = a.record.modelConfig.modelName;
          bValue = b.record.modelConfig.modelName;
          break;
        case 'tokens':
          aValue = a.record.tokens?.total || 0;
          bValue = b.record.tokens?.total || 0;
          break;
        case 'timestamp':
        default:
          aValue = a.record.timestamp;
          bValue = b.record.timestamp;
          break;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      }
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    });

    return filtered;
  }, [allHistoryRecords, viewMode, selectedChapterId, searchQuery, sortBy, sortOrder]);

  const chapterOptions = useMemo(() => {
    const allChapters = [
      ...project.chapters.filter((chapter) => chapter.history?.length),
      ...(project.virtualChapters?.filter((chapter) => chapter.history?.length) || []),
    ];

    return allChapters.sort((a, b) => a.order - b.order);
  }, [project.chapters, project.virtualChapters]);

  const totalStorageSizeKb = useMemo(
    () => (allHistoryRecords.reduce((total, item) => total + JSON.stringify(item.record).length, 0) / 1024).toFixed(2),
    [allHistoryRecords],
  );

  const getChapterDisplayTitle = (chapter: (typeof chapterOptions)[number]) => {
    if (chapter.order === -1) {
      return chapter.title;
    }
    return t('history.chapterDisplayTitle', { num: chapter.order + 1, title: chapter.title });
  };

  const toggleSelectAll = () => {
    if (selectedHistoryIds.size === filteredHistoryRecords.length) {
      setSelectedHistoryIds(new Set());
      return;
    }

    setSelectedHistoryIds(new Set(filteredHistoryRecords.map((item) => item.record.id)));
  };

  const toggleHistorySelection = (id: string) => {
    setSelectedHistoryIds((current) => toggleSetValue(current, id));
  };

  const deleteSelectedHistory = async () => {
    if (selectedHistoryIds.size === 0) {
      dialogService.alert(t('history.noSelection'));
      return;
    }

    if (!(await dialogService.confirm({ message: t('history.deleteConfirm', { count: selectedHistoryIds.size }), danger: true }))) {
      return;
    }

    const updatedChapters = project.chapters.map((chapter) => {
      if (!chapter.history?.length) {
        return chapter;
      }

      const history = chapter.history.filter((record) => !selectedHistoryIds.has(record.id));
      return { ...chapter, history: history.length > 0 ? history : undefined };
    });

    const updatedVirtualChapters = project.virtualChapters?.map((chapter) => {
      if (!chapter.history?.length) {
        return chapter;
      }

      const history = chapter.history.filter((record) => !selectedHistoryIds.has(record.id));
      return { ...chapter, history: history.length > 0 ? history : undefined };
    }) || [];

    onUpdate({ chapters: updatedChapters, virtualChapters: updatedVirtualChapters });
    setSelectedHistoryIds(new Set());
  };

  const clearAllHistory = async () => {
    if (allHistoryRecords.length === 0) {
      dialogService.alert(t('history.nothingToClear'));
      return;
    }

    if (!(await dialogService.confirm({ message: t('history.clearConfirm', { count: allHistoryRecords.length }), danger: true }))) {
      return;
    }

    onUpdate({
      chapters: project.chapters.map((chapter) => ({ ...chapter, history: undefined })),
      virtualChapters: project.virtualChapters?.map((chapter) => ({ ...chapter, history: undefined })) || [],
    });
    setSelectedHistoryIds(new Set());
  };

  if (mode === 'sidebar') {
    return (
      <div className="h-full flex flex-col bg-white border-l border-gray-200 shadow-lg animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">{t('history.sidebarTitle')}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Global History Viewer</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all"
            title={t('history.closeSidebar')}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('history.statTotal')}</div>
              <div className="text-base font-bold text-blue-600">{allHistoryRecords.length}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('history.statChapters')}</div>
              <div className="text-base font-bold text-green-600">{chapterOptions.length}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('history.statSelected')}</div>
              <div className="text-base font-bold text-purple-600">{selectedHistoryIds.size}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={clearAllHistory}
              className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              disabled={allHistoryRecords.length === 0}
              title={t('history.clearAllTitle')}
            >
              <i className="fas fa-trash-can text-xs"></i>
            </button>
            <button
              onClick={deleteSelectedHistory}
              className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              disabled={selectedHistoryIds.size === 0}
              title={t('history.deleteSelectedTitle')}
            >
              <i className="fas fa-trash text-xs"></i>
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 bg-white space-y-3 shrink-0">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t('history.viewModeLabel')}</label>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setViewMode('all');
                  setSelectedChapterId(null);
                }}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t('history.viewAll')}
              </button>
              <button
                onClick={() => setViewMode('chapter')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'chapter' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                disabled={chapterOptions.length === 0}
              >
                {t('history.viewChapter')}
              </button>
            </div>
          </div>

          {viewMode === 'chapter' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">{t('history.selectChapterLabel')}</label>
              <select
                value={selectedChapterId || ''}
                onChange={(event) => setSelectedChapterId(event.target.value || null)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
              >
                <option value="">{t('history.selectChapterPlaceholder')}</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {getChapterDisplayTitle(chapter)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t('history.searchLabel')}</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('history.searchPlaceholder')}
                className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 pl-8 outline-none focus:ring-1 focus:ring-blue-200"
              />
              <i className="fas fa-search absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">{t('history.sortLabel')}</label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as AIHistorySortBy)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
              >
                <option value="timestamp">{t('history.sortTime')}</option>
                <option value="model">{t('history.sortModel')}</option>
                <option value="tokens">{t('history.sortTokens')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">{t('history.orderLabel')}</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${sortOrder === 'desc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {t('history.desc')}
                </button>
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${sortOrder === 'asc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {t('history.asc')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <AIHistoryRecordList
          variant="sidebar"
          records={filteredHistoryRecords}
          selectedHistoryIds={selectedHistoryIds}
          searchQuery={searchQuery}
          viewMode={viewMode}
          selectedChapterId={selectedChapterId}
          onToggleSelectAll={toggleSelectAll}
          onToggleHistorySelection={toggleHistorySelection}
          getChapterDisplayTitle={getChapterDisplayTitle}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">{t('history.modalTitle')}</h2>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-2">Global AI History Viewer</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all shadow-lg"
            title={t('history.closeViewer')}
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('history.statTotal')}</div>
              <div className="text-2xl font-bold text-blue-600">{allHistoryRecords.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('history.statChapters')}</div>
              <div className="text-2xl font-bold text-green-600">{chapterOptions.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('history.statSelected')}</div>
              <div className="text-2xl font-bold text-purple-600">{selectedHistoryIds.size}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('history.statStorage')}</div>
              <div className="text-lg font-bold text-gray-600">{totalStorageSizeKb} KB</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={clearAllHistory}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
              disabled={allHistoryRecords.length === 0}
              title={t('history.clearAllTitle')}
            >
              <i className="fas fa-trash-can"></i>
              {t('history.clearAll')}
            </button>
            <button
              onClick={deleteSelectedHistory}
              className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-200"
              disabled={selectedHistoryIds.size === 0}
              title={t('history.deleteSelectedTitle')}
            >
              <i className="fas fa-trash"></i>
              {t('history.deleteSelected', { count: selectedHistoryIds.size })}
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-gray-100 bg-white grid grid-cols-4 gap-6 shrink-0">
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-2">{t('history.viewModeLabel')}</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setViewMode('all');
                  setSelectedChapterId(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t('history.viewAllFull')}
              </button>
              <button
                onClick={() => setViewMode('chapter')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'chapter' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                disabled={chapterOptions.length === 0}
              >
                {t('history.viewChapterFull')}
              </button>
            </div>
          </div>

          {viewMode === 'chapter' && (
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">{t('history.selectChapterLabel')}</label>
              <select
                value={selectedChapterId || ''}
                onChange={(event) => setSelectedChapterId(event.target.value || null)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                <option value="">{t('history.selectChapterPlaceholder')}</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {getChapterDisplayTitle(chapter)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={viewMode === 'chapter' ? 'col-span-2' : 'col-span-3'}>
            <label className="block text-sm font-bold text-gray-500 mb-2">{t('history.searchContentLabel')}</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('history.searchPlaceholderFull')}
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-4 py-2 pl-10 outline-none focus:ring-2 focus:ring-blue-200"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">{t('history.sortLabelFull')}</label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as AIHistorySortBy)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                <option value="timestamp">{t('history.sortTimeFull')}</option>
                <option value="model">{t('history.sortModelFull')}</option>
                <option value="tokens">{t('history.sortTokensFull')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">{t('history.orderLabelFull')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${sortOrder === 'desc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {t('history.desc')}
                </button>
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${sortOrder === 'asc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {t('history.asc')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <AIHistoryRecordList
          variant="modal"
          records={filteredHistoryRecords}
          selectedHistoryIds={selectedHistoryIds}
          searchQuery={searchQuery}
          viewMode={viewMode}
          selectedChapterId={selectedChapterId}
          onToggleHistorySelection={toggleHistorySelection}
          getChapterDisplayTitle={getChapterDisplayTitle}
        />

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="text-sm text-gray-500">{t('history.footerTotal', { count: allHistoryRecords.length, size: totalStorageSizeKb })}</div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-8 py-4 rounded-xl text-gray-500 font-bold text-base hover:bg-gray-200 hover:text-gray-800 transition-all"
            >
              {t('history.close')}
            </button>
            <button
              onClick={deleteSelectedHistory}
              className="px-10 py-4 bg-red-600 text-white font-black text-base rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2"
              disabled={selectedHistoryIds.size === 0}
            >
              <i className="fas fa-trash"></i>
              {t('history.deleteSelectedRecords', { count: selectedHistoryIds.size })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHistoryViewer;
