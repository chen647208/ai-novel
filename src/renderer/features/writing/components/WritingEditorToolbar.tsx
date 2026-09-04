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
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';
import { ArrowLeft, Camera, ChevronsRight, Eraser, FileOutput, FileText, History, Maximize2, Minimize2, Sprout } from 'lucide-react';

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
  const actionButton = 'text-muted-foreground';
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex flex-wrap items-center justify-between gap-y-2 border-b border-border px-10 py-4 transition-colors',
        isFocusMode ? 'bg-background/80 backdrop-blur-sm' : 'bg-card'
      )}
    >
      <div className="flex min-w-[240px] flex-1 items-center gap-5">
        {!isFocusMode && (
          <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={onBack} title={t('toolbar.back')}>
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">{t('toolbar.writingLabel')}</span>
          {activeChapterId ? (
            <input
              className={cn(
                'w-full min-w-0 border-none bg-transparent p-0 font-serif text-2xl font-medium text-foreground outline-none placeholder:text-muted-foreground/40',
                isFocusMode ? 'max-w-[60ch]' : 'max-w-96'
              )}
              value={activeChapterTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={t('toolbar.titlePlaceholder')}
            />
          ) : (
            <span className="font-serif text-2xl font-medium text-muted-foreground/50">{t('toolbar.selectChapter')}</span>
          )}
        </div>
      </div>
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
        {/* 统计信息：本章 + 全书 + 今日 */}
        <div
          className="mr-1 hidden items-center gap-3 text-xs text-muted-foreground lg:flex"
          title={t('toolbar.statsTitle', { paragraphs: chapterStats.paragraphs, sentences: chapterStats.sentences, minutes: chapterStats.readingMinutes })}
        >
          <span>
            {t('toolbar.thisChapter')}
            <span className="font-medium tabular-nums text-foreground">{formatCharCount(chapterStats.charCount)}</span>
          </span>
          <span className="text-border">|</span>
          <span>
            {t('toolbar.wholeBook')}
            <span className="font-medium tabular-nums text-foreground">{formatCharCount(bookStats.totalCharCount)}</span>
          </span>
          {bookStats.todayCharCount > 0 && (
            <>
              <span className="text-border">|</span>
              <span className="text-success">{t('toolbar.todayAdded', { count: formatCharCount(bookStats.todayCharCount) })}</span>
            </>
          )}
        </div>

        {!isFocusMode && (
          <>
            {activeChapterId && (
              <Button variant="ghost" size="sm" className={cn(actionButton, 'hover:text-foreground')} onClick={onManualSnapshot} title={t('toolbar.snapshotTitle', { count: snapshotCount })}>
                <Camera className="size-4" /> {t('toolbar.snapshot')}
              </Button>
            )}
            {hasProjectChapters && (
              <Button variant="ghost" size="sm" className={cn(actionButton, 'hover:text-foreground')} onClick={onOpenExport} title={t('toolbar.exportTitle')}>
                <FileOutput className="size-4" /> {t('toolbar.export')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(actionButton, 'gap-1.5', overdueForeshadowCount > 0 ? 'text-destructive hover:text-destructive' : 'hover:text-foreground')}
              onClick={onOpenForeshadow}
              title={overdueForeshadowCount > 0 ? t('toolbar.foreshadowTitleOverdue', { open: openForeshadowCount, overdue: overdueForeshadowCount }) : t('toolbar.foreshadowTitle', { open: openForeshadowCount })}
            >
              <Sprout className="size-4" /> {t('toolbar.foreshadow')}
              {openForeshadowCount > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                    overdueForeshadowCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                  )}
                >
                  {openForeshadowCount}
                </span>
              )}
            </Button>
            {activeChapterId && (
              <Button variant="ghost" size="sm" className={cn(actionButton, 'hover:text-destructive')} onClick={onClearContent} title={t('toolbar.clearTitle')}>
                <Eraser className="size-4" /> {t('toolbar.clear')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(actionButton, isGlobalHistorySidebarOpen && 'bg-accent text-foreground')}
              onClick={onToggleGlobalHistory}
              title={t('toolbar.globalHistoryTitle')}
            >
              <History className="size-4" /> {t('toolbar.globalHistory')}
            </Button>
            {activeChapterId && hasActiveChapterHistory && (
              <Button variant="ghost" size="sm" className={cn(actionButton, 'hover:text-foreground')} onClick={onOpenChapterHistory} title={t('toolbar.chapterHistoryTitle')}>
                <FileText className="size-4" /> {t('toolbar.chapterHistory')}
              </Button>
            )}
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(actionButton, isFocusMode && 'text-primary hover:text-primary')}
          onClick={onToggleFocusMode}
          title={isFocusMode ? t('toolbar.exitFocusTitle') : t('toolbar.enterFocusTitle')}
        >
          {isFocusMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />} {isFocusMode ? t('toolbar.exitFocus') : t('toolbar.focus')}
        </Button>
        {!isSidebarOpen && !isFocusMode && (
          <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={onOpenSidebar} title={t('toolbar.openSidebar')}>
            <ChevronsRight className="size-4" />
          </Button>
        )}
        <div className="ml-1 flex flex-col items-end">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('toolbar.charCountLabel')}
            <span className="tabular-nums text-foreground">{chapterStats.charCount}</span>
          </span>
          <span className="mt-0.5 text-[10px] italic text-muted-foreground/70">{t('toolbar.autoSave', { time: new Date(lastSaved).toLocaleTimeString(i18n.language) })}</span>
        </div>
      </div>
    </div>
  );
};

export default WritingEditorToolbar;
