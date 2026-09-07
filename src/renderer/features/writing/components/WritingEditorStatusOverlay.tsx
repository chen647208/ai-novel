/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WritingEditorStatusOverlayProps } from '../types';
import { Button } from '@/shared/ui/Button';
import { Square } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';

const WritingEditorStatusOverlay: React.FC<WritingEditorStatusOverlayProps> = ({
  isGenerating,
  isStreaming,
  isBatchGenerating,
  targetWordCount,
  selectedKnowledgeCount,
  streamingContentLength,
  batchProgress,
  onStopStreaming,
  onStopBatchGeneration,
}) => {
  const { t } = useTranslation('writing');
  return (
    <>
      {isGenerating && !isStreaming && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-8 shadow-lg">
            <Spinner className="mb-4 size-10 text-primary" strokeWidth={2} />
            <p className="text-xs font-medium uppercase tracking-widest text-foreground">{t('statusOverlay.generating')}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t('statusOverlay.targetWords', { count: targetWordCount })}</p>
            <p className="mt-1 text-2xs text-muted-foreground/70">{t('statusOverlay.contextInjected', { count: selectedKnowledgeCount })}</p>
          </div>
        </div>
      )}

      {isStreaming && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-8 shadow-lg">
            <Spinner className="mb-4 size-10 text-success" strokeWidth={2} />
            <p className="text-xs font-medium uppercase tracking-widest text-foreground">{t('statusOverlay.streaming')}</p>
            <p className="mt-2 text-xs tabular-nums text-muted-foreground">{t('statusOverlay.generatedSoFar', { count: streamingContentLength })}</p>
            <p className="mt-1 text-2xs text-muted-foreground/70">{t('statusOverlay.streamingHint')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-destructive hover:text-destructive"
              onClick={onStopStreaming}
            >
              <Square className="size-3.5" /> {t('statusOverlay.stop')}
            </Button>
          </div>
        </div>
      )}

      {isBatchGenerating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex max-w-md flex-col items-center rounded-xl border border-border bg-card p-8 shadow-lg">
            <Spinner className="mb-4 size-10 text-primary" strokeWidth={2} />
            <p className="text-xs font-medium uppercase tracking-widest text-foreground">{t('statusOverlay.batchInProgress')}</p>

            <div className="mb-2 mt-4 w-full">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t('statusOverlay.batchProgress', { current: batchProgress.current, total: batchProgress.total })}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
            </div>

            <p className="mt-3 mb-1 truncate text-sm font-medium">
              {batchProgress.currentChapterTitle}
            </p>
            <p className="text-2xs text-muted-foreground">{t('statusOverlay.currentChapter')}</p>

            <Button
              variant="outline"
              className="mt-6 text-destructive hover:text-destructive"
              onClick={onStopBatchGeneration}
            >
              <Square className="size-4" /> {t('statusOverlay.stopBatch')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default WritingEditorStatusOverlay;
