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
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';
import { Select } from '@/shared/ui/Select';
import { cn } from '@/shared/utils/cn';
import { Search, Trash, Trash2, X } from 'lucide-react';
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

  const filterLabel = 'mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground';
  const segmented = (active: boolean, disabled = false) =>
    cn(
      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
      active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      disabled && 'cursor-not-allowed opacity-50 hover:text-muted-foreground'
    );

  if (mode === 'sidebar') {
    return (
      <div className="flex h-full flex-col border-l border-border bg-card">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <h3 className="font-serif text-base font-medium text-foreground">{t('history.sidebarTitle')}</h3>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} title={t('history.closeSidebar')}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('history.statTotal')}</div>
              <div className="text-sm font-medium tabular-nums text-foreground">{allHistoryRecords.length}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('history.statChapters')}</div>
              <div className="text-sm font-medium tabular-nums text-foreground">{chapterOptions.length}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('history.statSelected')}</div>
              <div className="text-sm font-medium tabular-nums text-foreground">{selectedHistoryIds.size}</div>
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={clearAllHistory}
              disabled={allHistoryRecords.length === 0}
              title={t('history.clearAllTitle')}
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={deleteSelectedHistory}
              disabled={selectedHistoryIds.size === 0}
              title={t('history.deleteSelectedTitle')}
            >
              <Trash className="size-4" />
            </Button>
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-b border-border p-4">
          <div>
            <Label className={filterLabel}>{t('history.viewModeLabel')}</Label>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => {
                  setViewMode('all');
                  setSelectedChapterId(null);
                }}
                className={cn('flex-1', segmented(viewMode === 'all'))}
              >
                {t('history.viewAll')}
              </button>
              <button
                onClick={() => setViewMode('chapter')}
                className={cn('flex-1', segmented(viewMode === 'chapter', chapterOptions.length === 0))}
                disabled={chapterOptions.length === 0}
              >
                {t('history.viewChapter')}
              </button>
            </div>
          </div>

          {viewMode === 'chapter' && (
            <div>
              <Label className={filterLabel}>{t('history.selectChapterLabel')}</Label>
              <Select
                className="h-8 text-xs"
                value={selectedChapterId || ''}
                onChange={(event) => setSelectedChapterId(event.target.value || null)}
              >
                <option value="">{t('history.selectChapterPlaceholder')}</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {getChapterDisplayTitle(chapter)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <Label className={filterLabel}>{t('history.searchLabel')}</Label>
            <div className="relative">
              <Input
                className="h-8 pl-8 text-xs"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('history.searchPlaceholder')}
              />
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className={filterLabel}>{t('history.sortLabel')}</Label>
              <Select
                className="h-8 text-xs"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as AIHistorySortBy)}
              >
                <option value="timestamp">{t('history.sortTime')}</option>
                <option value="model">{t('history.sortModel')}</option>
                <option value="tokens">{t('history.sortTokens')}</option>
              </Select>
            </div>
            <div>
              <Label className={filterLabel}>{t('history.orderLabel')}</Label>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <button onClick={() => setSortOrder('desc')} className={cn('flex-1', segmented(sortOrder === 'desc'))}>
                  {t('history.desc')}
                </button>
                <button onClick={() => setSortOrder('asc')} className={cn('flex-1', segmented(sortOrder === 'asc'))}>
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-[90vh] w-[94vw] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <DialogTitle className="font-serif text-lg">{t('history.modalTitle')}</DialogTitle>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-6 py-3">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('history.statTotal')}</div>
              <div className="text-lg font-medium tabular-nums text-foreground">{allHistoryRecords.length}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('history.statChapters')}</div>
              <div className="text-lg font-medium tabular-nums text-foreground">{chapterOptions.length}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('history.statSelected')}</div>
              <div className="text-lg font-medium tabular-nums text-foreground">{selectedHistoryIds.size}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('history.statStorage')}</div>
              <div className="text-lg font-medium tabular-nums text-foreground">{totalStorageSizeKb} KB</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={clearAllHistory}
              disabled={allHistoryRecords.length === 0}
              title={t('history.clearAllTitle')}
            >
              <Trash2 className="size-4" />
              {t('history.clearAll')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelectedHistory}
              disabled={selectedHistoryIds.size === 0}
              title={t('history.deleteSelectedTitle')}
            >
              <Trash className="size-4" />
              {t('history.deleteSelected', { count: selectedHistoryIds.size })}
            </Button>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-4 gap-4 border-b border-border bg-card p-4">
          <div>
            <Label className={filterLabel}>{t('history.viewModeLabel')}</Label>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => {
                  setViewMode('all');
                  setSelectedChapterId(null);
                }}
                className={cn('flex-1', segmented(viewMode === 'all'))}
              >
                {t('history.viewAllFull')}
              </button>
              <button
                onClick={() => setViewMode('chapter')}
                className={cn('flex-1', segmented(viewMode === 'chapter', chapterOptions.length === 0))}
                disabled={chapterOptions.length === 0}
              >
                {t('history.viewChapterFull')}
              </button>
            </div>
          </div>

          {viewMode === 'chapter' && (
            <div>
              <Label className={filterLabel}>{t('history.selectChapterLabel')}</Label>
              <Select
                value={selectedChapterId || ''}
                onChange={(event) => setSelectedChapterId(event.target.value || null)}
              >
                <option value="">{t('history.selectChapterPlaceholder')}</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {getChapterDisplayTitle(chapter)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className={viewMode === 'chapter' ? 'col-span-2' : 'col-span-3'}>
            <Label className={filterLabel}>{t('history.searchContentLabel')}</Label>
            <div className="relative">
              <Input
                className="pl-9"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('history.searchPlaceholderFull')}
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={filterLabel}>{t('history.sortLabelFull')}</Label>
              <Select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as AIHistorySortBy)}
              >
                <option value="timestamp">{t('history.sortTimeFull')}</option>
                <option value="model">{t('history.sortModelFull')}</option>
                <option value="tokens">{t('history.sortTokensFull')}</option>
              </Select>
            </div>
            <div>
              <Label className={filterLabel}>{t('history.orderLabelFull')}</Label>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <button onClick={() => setSortOrder('desc')} className={cn('flex-1', segmented(sortOrder === 'desc'))}>
                  {t('history.desc')}
                </button>
                <button onClick={() => setSortOrder('asc')} className={cn('flex-1', segmented(sortOrder === 'asc'))}>
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

        <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
          <div className="text-sm text-muted-foreground">{t('history.footerTotal', { count: allHistoryRecords.length, size: totalStorageSizeKb })}</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('history.close')}
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSelectedHistory}
              disabled={selectedHistoryIds.size === 0}
            >
              <Trash className="size-4" />
              {t('history.deleteSelectedRecords', { count: selectedHistoryIds.size })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIHistoryViewer;
