/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Chapter } from '../../../../shared/types';
import type { RevisionEntity } from '@core/entities';
import { repository } from '@/shared/services/repository';
import { formatHistoryTimestamp, getGenerationType, getProviderIcon } from '../utils';
import { listSnapshots, removeSnapshot } from '../services/chapterSnapshotService';
import { dialogService } from '@/shared/services/dialogService';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/Dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { cn } from '@/shared/utils/cn';
import { Bot, Camera, Copy, History, Redo2, RotateCcw, Trash2 } from 'lucide-react';

interface ChapterHistoryModalProps {
  isOpen: boolean;
  chapter: Chapter | null | undefined;
  onClose: () => void;
  onApplyContent: (content: string) => void;
  onClearHistory: () => void;
  onUpdateChapter?: (chapter: Chapter) => void;
}

const DEFAULT_SOURCE_CLS = 'bg-muted text-muted-foreground';
const MANUAL_SOURCE_CLS = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
const BEFORE_CLEAR_SOURCE_CLS = 'bg-destructive/10 text-destructive';

const ChapterHistoryModal: React.FC<ChapterHistoryModalProps> = ({
  isOpen,
  chapter,
  onClose,
  onApplyContent,
  onClearHistory,
  onUpdateChapter,
}) => {
  const { t } = useTranslation('writing');
  const [tab, setTab] = useState<'ai' | 'snapshot' | 'revisions'>('ai');
  const [revisions, setRevisions] = useState<RevisionEntity[]>([]);

  // 修订记录按需加载：节点 id 即章节 id（bridge 平铺时原样透传）；
  // 应用走正常回写路径（onApplyContent），自然产生一条新修订，无需写回管线
  useEffect(() => {
    if (!isOpen || !chapter || tab !== 'revisions') return;
    let cancelled = false;
    const pending = repository.loadRevisions?.(chapter.id);
    if (!pending) {
      setRevisions([]);
      return;
    }
    pending
      .then((rows) => {
        if (!cancelled) setRevisions([...rows].sort((a, b) => b.seq - a.seq));
      })
      .catch(() => {
        if (!cancelled) setRevisions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, chapter, tab]);

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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-[85vh] w-[92vw] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-4">
          <DialogTitle className="font-serif text-lg">{t('chapterHistory.title')}</DialogTitle>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('chapterHistory.chapterHeader', { num: chapter.order + 1, title: chapter.title })}
          </p>
        </div>

        <div className="flex shrink-0 gap-4 border-b border-border bg-card px-6">
          <button
            onClick={() => setTab('ai')}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-xs font-medium transition-colors',
              tab === 'ai' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Bot className="size-3.5" /> {t('chapterHistory.tabAI', { count: sortedHistory.length })}
          </button>
          <button
            onClick={() => setTab('snapshot')}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-xs font-medium transition-colors',
              tab === 'snapshot' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Camera className="size-3.5" /> {t('chapterHistory.tabSnapshot', { count: snapshots.length })}
          </button>
          <button
            onClick={() => setTab('revisions')}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-xs font-medium transition-colors',
              tab === 'revisions' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <History className="size-3.5" /> {t('chapterHistory.tabRevisions', { count: revisions.length })}
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto bg-muted/20 p-5">
          {tab === 'snapshot' ? (
            snapshots.length > 0 ? (
              snapshots.map((snap) => {
                const label = sourceLabels[snap.source] ?? fallbackSourceLabel;
                return (
                  <div key={snap.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs font-medium', label.cls)}>{label.text}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{formatHistoryTimestamp(snap.timestamp)}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {t('chapterHistory.charCountInfo', { count: snap.charCount, preview: snap.content.slice(0, 40).replace(/\n/g, ' ') || t('chapterHistory.emptyPreview') })}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleRestoreSnapshot(snap.content)} title={t('chapterHistory.restoreTitle')}>
                        <RotateCcw className="size-3.5" /> {t('chapterHistory.restore')}
                      </Button>
                      {onUpdateChapter && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onUpdateChapter(removeSnapshot(chapter, snap.id))}
                          title={t('chapterHistory.deleteSnapshotTitle')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState icon={Camera} title={t('chapterHistory.noSnapshots')} description={t('chapterHistory.noSnapshotsHint')} />
            )
          ) : tab === 'revisions' ? (
            revisions.length > 0 ? (
              <div className="space-y-3">
                {revisions.map((rev) => (
                  <div key={rev.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums">#{rev.seq}</span>
                        <span>{formatHistoryTimestamp(rev.createdAt)}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {t('chapterHistory.revisionAuthor')}: {rev.author}
                        {rev.cause ? ` · ${t('chapterHistory.revisionCause')}: ${rev.cause}` : ''}
                        {` · ${rev.body.slice(0, 60).replace(/\n/g, ' ') || t('chapterHistory.emptyPreview')}`}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        onApplyContent(rev.body);
                        onClose();
                      }}
                      title={t('chapterHistory.revisionApplyTitle')}
                    >
                      <Redo2 className="size-3.5" /> {t('chapterHistory.revisionApply')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={History} title={t('chapterHistory.noRevisions')} description={t('chapterHistory.noRevisionsHint')} />
            )
          ) : sortedHistory.length > 0 ? (
            <div className="space-y-4">
              {sortedHistory.map((record) => (
                <div key={record.id} className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      {(() => { const { icon: PIcon, cls } = getProviderIcon(record.modelConfig.provider); return <PIcon className={cn('size-5', cls)} />; })()}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{record.modelConfig.modelName}</span>
                          <span className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                            {getGenerationType(record)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {record.metadata?.templateName || t('chapterHistory.customGeneration')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-medium text-foreground">{formatHistoryTimestamp(record.timestamp)}</div>
                      <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {record.tokens ? `${record.tokens.total} tokens` : 'N/A tokens'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('chapterHistory.promptLabel')}</div>
                      <div className="custom-scrollbar max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground/80">
                        {record.prompt}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('chapterHistory.contentLabel')}</div>
                      <div className="custom-scrollbar max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-primary/20 bg-primary/5 p-3 font-serif text-sm leading-relaxed text-foreground">
                        {record.generatedContent}
                      </div>
                      <div className="mt-1.5 text-right text-xs tabular-nums text-muted-foreground">
                        {t('chapterHistory.lengthInfo', { count: record.generatedContent.length })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('chapterHistory.modelConfigLabel')}</div>
                        <div className="space-y-1">
                          <div className="text-sm text-foreground/80">
                            <span className="font-medium">{t('chapterHistory.providerLabel')}</span> {record.modelConfig.provider}
                          </div>
                          {record.modelConfig.temperature !== undefined && (
                            <div className="text-sm text-foreground/80">
                              <span className="font-medium">{t('chapterHistory.temperatureLabel')}</span> {record.modelConfig.temperature}
                            </div>
                          )}
                          {record.modelConfig.maxTokens !== undefined && (
                            <div className="text-sm text-foreground/80">
                              <span className="font-medium">{t('chapterHistory.maxTokensLabel')}</span> {record.modelConfig.maxTokens}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('record.tokenUsage')}</div>
                        <div className="space-y-1">
                          <div className="text-sm tabular-nums text-foreground/80"><span className="font-medium">{t('chapterHistory.inputLabel')}</span> {record.tokens?.prompt || 'N/A'}</div>
                          <div className="text-sm tabular-nums text-foreground/80"><span className="font-medium">{t('chapterHistory.outputLabel')}</span> {record.tokens?.completion || 'N/A'}</div>
                          <div className="text-sm tabular-nums text-foreground/80"><span className="font-medium">{t('chapterHistory.totalLabel')}</span> {record.tokens?.total || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-border pt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(record.generatedContent);
                          dialogService.alert(t('record.copied'));
                        }}
                      >
                        <Copy className="size-3.5" /> {t('record.copyContent')}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          onApplyContent(record.generatedContent);
                          onClose();
                        }}
                      >
                        <Redo2 className="size-3.5" /> {t('chapterHistory.reapply')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={History} title={t('chapterHistory.noHistory')} description={t('chapterHistory.noHistoryHint')} />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
          <div className="text-xs text-muted-foreground">{t('chapterHistory.footerCount', { count: chapter.history?.length || 0 })}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onClearHistory}>
              <Trash2 className="size-3.5" /> {t('chapterHistory.clearHistory')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('chapterHistory.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChapterHistoryModal;
