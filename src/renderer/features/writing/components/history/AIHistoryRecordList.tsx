/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { TFunction } from 'i18next';
import { Check, ChevronRight, Copy, Eye, History } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { dialogService } from '@/shared/services/dialogService';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { cn } from '@/shared/utils/cn';

import type { AIHistoryRecordListProps, AIHistoryRecordWithChapter } from '../../types';
import { formatHistoryTimestamp, formatTokenUsage, getGenerationType, getProviderIcon } from '../../utils';

const sectionLabel = 'mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground';

const renderTemplateBlock = (item: AIHistoryRecordWithChapter, compact: boolean, t: TFunction<'writing'>) => {
  if (!item.record.metadata?.templateName) {
    return null;
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className={sectionLabel}>{t('record.useTemplate')}</div>
      <div className={cn('font-medium text-foreground', compact ? 'text-sm' : 'text-base')}>
        {item.record.metadata.templateName}
      </div>
    </div>
  );
};

const renderTokenBlock = (item: AIHistoryRecordWithChapter, t: TFunction<'writing'>) => (
  <div className="rounded-lg border border-border bg-muted/30 p-4">
    <div className={sectionLabel}>{t('record.tokenUsage')}</div>
    {item.record.tokens ? (
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('record.input')}</span>
          <span className="font-medium tabular-nums text-foreground">{item.record.tokens.prompt}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('record.output')}</span>
          <span className="font-medium tabular-nums text-foreground">{item.record.tokens.completion}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-1.5">
          <span className="font-medium text-foreground">{t('record.total')}</span>
          <span className="font-medium tabular-nums text-foreground">{item.record.tokens.total}</span>
        </div>
      </div>
    ) : (
      <div className="text-sm italic text-muted-foreground">{t('record.noTokenData')}</div>
    )}
  </div>
);

const renderActionBlock = (item: AIHistoryRecordWithChapter, compact: boolean, t: TFunction<'writing'>) => (
  <div className="rounded-lg border border-border bg-muted/30 p-4">
    <div className={sectionLabel}>{t('record.actions')}</div>
    <div className="space-y-2">
      <Button
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        className="w-full"
        onClick={() => {
          void navigator.clipboard.writeText(item.record.generatedContent);
          dialogService.alert(t('record.copied'));
        }}
      >
        <Copy className="size-4" />
        {t('record.copyContent')}
      </Button>
      <Button
        variant="ghost"
        size={compact ? 'sm' : 'md'}
        className="w-full"
        onClick={() => {
          dialogService.alert(t('record.fullPromptDialog', { prompt: item.record.prompt }));
        }}
      >
        <Eye className="size-4" />
        {t('record.viewPrompt')}
      </Button>
    </div>
  </div>
);

const AIHistoryRecordCard: React.FC<{
  item: AIHistoryRecordWithChapter;
  isSelected: boolean;
  compact: boolean;
  onToggle: (id: string) => void;
  getChapterDisplayTitle: (chapter: AIHistoryRecordWithChapter['chapter']) => string;
}> = ({ item, isSelected, compact, onToggle, getChapterDisplayTitle }) => {
  const { t } = useTranslation('writing');
  const generationType = getGenerationType(item.record);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-card transition-colors',
        isSelected ? 'border-primary/40' : 'border-border hover:border-primary/20'
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isSelected}
        className={cn(
          'flex cursor-pointer items-center justify-between border-b border-border bg-muted/30',
          compact ? 'p-4' : 'p-5',
          !isSelected && 'border-b-transparent'
        )}
        onClick={() => onToggle(item.record.id)}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            onToggle(item.record.id);
          }
        }}
      >
        <div className={cn('flex min-w-0 items-center', compact ? 'gap-3' : 'gap-4')}>
          <span
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
              isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
            )}
          >
            {isSelected && <Check className="size-3" />}
          </span>

          <div className={cn('flex min-w-0 items-center', compact ? 'gap-2.5' : 'gap-3')}>
            {(() => { const { icon: PIcon, cls } = getProviderIcon(item.record.modelConfig.provider); return <PIcon className={cn('size-4 shrink-0', cls)} />; })()}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('truncate font-medium text-foreground', compact ? 'text-sm' : 'text-base')}>
                  {item.record.modelConfig.modelName}
                </span>
                <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                  {generationType}
                </span>
              </div>
              <div className={cn('truncate text-xs text-muted-foreground', !compact && 'mt-0.5')}>
                {getChapterDisplayTitle(item.chapter)}
              </div>
            </div>
          </div>
        </div>

        <div className={cn('flex shrink-0 items-center', compact ? 'gap-3' : 'gap-4')}>
          <div className="text-right">
            <div className={cn('text-xs font-medium text-foreground', !compact && 'text-sm')}>
              {formatHistoryTimestamp(item.record.timestamp)}
            </div>
            <div className="mt-0.5 text-2xs tabular-nums text-muted-foreground">
              {item.record.tokens ? `${item.record.tokens.total} tokens` : 'N/A tokens'}
            </div>
          </div>
          <ChevronRight className={cn('size-4 text-muted-foreground transition-transform', isSelected && 'rotate-90')} />
        </div>
      </div>

      {isSelected && (
        <div className={cn('space-y-4', compact ? 'p-4' : 'p-5')}>
          {renderTemplateBlock(item, compact, t)}

          <div className={compact ? 'space-y-4' : 'grid grid-cols-2 gap-4'}>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className={sectionLabel}>{t('record.fullPromptLabel')}</div>
              <div className={cn(' overflow-y-auto whitespace-pre-wrap leading-relaxed text-foreground/80', compact ? 'max-h-40 text-xs' : 'max-h-64 text-sm')}>
                {item.record.prompt}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className={sectionLabel}>{t('record.generatedContentLabel')}</div>
              <div className={cn(' overflow-y-auto whitespace-pre-wrap leading-relaxed text-foreground/80', compact ? 'max-h-40 text-xs' : 'max-h-64 text-sm')}>
                {item.record.generatedContent}
              </div>
            </div>
          </div>

          {compact ? (
            <div className="grid grid-cols-1 gap-4">
              {renderTokenBlock(item, t)}
              {renderActionBlock(item, compact, t)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className={sectionLabel}>{t('record.summaryInfo')}</div>
                  <div className="space-y-1 text-sm text-foreground/80">
                    <div>{t('record.summaryChapter')}{getChapterDisplayTitle(item.chapter)}</div>
                    <div>{t('record.summaryType')}{generationType}</div>
                    <div>{t('record.summaryTime')}{formatHistoryTimestamp(item.record.timestamp)}</div>
                    <div>{t('record.summaryToken')}{formatTokenUsage(item.record.tokens)}</div>
                  </div>
                </div>
                {renderTokenBlock(item, t)}
              </div>
              <div className="space-y-4">
                {renderActionBlock(item, compact, t)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AIHistoryRecordList: React.FC<AIHistoryRecordListProps> = ({
  variant,
  records,
  selectedHistoryIds,
  searchQuery,
  viewMode,
  selectedChapterId,
  onToggleSelectAll,
  onToggleHistorySelection,
  getChapterDisplayTitle,
}) => {
  const { t } = useTranslation('writing');
  const compact = variant === 'sidebar';
  const allSelected = selectedHistoryIds.size === records.length && records.length > 0;

  return (
    <>
      {compact && onToggleSelectAll && (
        <div className="shrink-0 border-b border-border bg-card px-4 py-2">
          <div className="flex items-center justify-between">
            <div
              role="checkbox"
              aria-checked={allSelected}
              tabIndex={0}
              onClick={onToggleSelectAll}
              onKeyDown={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault();
                  onToggleSelectAll();
                }
              }}
              className="flex cursor-pointer items-center gap-2 select-none"
            >
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded border transition-colors',
                  allSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
                )}
              >
                {allSelected && <Check className="size-3" />}
              </span>
              <span className="text-xs font-medium text-foreground">{allSelected ? t('record.deselectAll') : t('record.selectAll')}</span>
            </div>
            <div className="text-xs tabular-nums text-muted-foreground">{t('record.countUnit', { count: records.length })}</div>
          </div>
        </div>
      )}

      <div className={cn(' flex-1 overflow-y-auto bg-muted/20', compact ? 'p-4' : 'p-6')}>
        {records.length === 0 ? (
          <EmptyState
            icon={History}
            title={t('record.emptyTitle')}
            description={
              searchQuery.trim()
                ? t('record.emptyNoMatch')
                : viewMode === 'chapter' && !selectedChapterId
                  ? t('record.emptyPickChapter')
                  : t('record.emptyDefault')
            }
          />
        ) : (
          <div className={compact ? 'space-y-3' : 'space-y-4'}>
            {records.map((item) => (
              <AIHistoryRecordCard
                key={item.record.id}
                item={item}
                compact={compact}
                isSelected={selectedHistoryIds.has(item.record.id)}
                onToggle={onToggleHistorySelection}
                getChapterDisplayTitle={getChapterDisplayTitle}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AIHistoryRecordList;
