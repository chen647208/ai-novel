/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 知识库列表面板（从 StepKnowledgeEnhanced 抽出）：分类筛选、条目与上传区。 */
import { BookOpen, CloudUpload } from 'lucide-react';
import React, { useState } from 'react';

import { i18n,useTranslation } from '@/i18n';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Progress } from '@/shared/ui/Progress';
import { Spinner } from '@/shared/ui/Spinner';
import { cn } from '@/shared/utils/cn';
import { formatBytes, formatDate } from '@/shared/utils/format';

import { type KnowledgeCategory, type KnowledgeItem } from '../../../../shared/types';

const CATEGORY_FILTERS = ['all', 'inspiration', 'character', 'outline', 'chapter', 'writing'] as const;

export interface KnowledgeListPanelProps {
  items: KnowledgeItem[];
  selectedCategory: KnowledgeCategory | 'all';
  onCategoryChange: (category: KnowledgeCategory | 'all') => void;
  activeId: string | null;
  onSelect: (item: KnowledgeItem) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onFiles: (files: FileList) => void;
  isIndexing: boolean;
  indexProgress: number;
  onGoSection?: (next: 'structure') => void;
}

export const KnowledgeListPanel: React.FC<KnowledgeListPanelProps> = ({
  items,
  selectedCategory,
  onCategoryChange,
  activeId,
  onSelect,
  onDelete,
  onFiles,
  isIndexing,
  indexProgress,
  onGoSection,
}) => {
  const { t } = useTranslation('knowledge');
  const [dragActive, setDragActive] = useState(false);
  const getCategoryDisplayName = (category: KnowledgeCategory | 'all'): string => t(`category.${category}`);

  return (
    <Card className="col-span-1 flex flex-col overflow-hidden">
      <div className="flex-none border-b border-border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">{t('center.knowledgeList')}</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          {CATEGORY_FILTERS.map(category => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {getCategoryDisplayName(category)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t('center.emptyContent')}
            description={t('center.emptyContentHint')}
            className="py-8"
            action={
              <div className="flex flex-col gap-2">
                <Button onClick={() => document.getElementById('file-upload')?.click()}>
                  {t('selectFiles')}
                </Button>
                {onGoSection && (
                  <Button variant="outline" onClick={() => onGoSection('structure')}>
                    {t('goStructure')}
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className={cn(
                  'cv-auto group cursor-pointer rounded-lg border p-3 transition-colors',
                  activeId === item.id
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:bg-accent/40',
                )}
                onClick={() => onSelect(item)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium">{item.name}</h4>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5">
                        {t(`categoryShort.${item.category}`)}
                      </span>
                      <span className="tabular-nums">{formatBytes(item.size)}</span>
                      <span>{formatDate(item.addedAt, i18n.language)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => void onDelete(e, item.id)}
                    className="ml-2 h-auto shrink-0 px-2 py-1 text-xs font-normal opacity-0 group-hover:opacity-100"
                  >
                    {t('center.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-none border-t border-border p-4">
        <div
          className={cn(
            'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40',
          )}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onFiles(e.dataTransfer.files);
            }
          }}
        >
          <CloudUpload className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="mt-2 text-sm text-foreground">{t('center.dropTitle')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('center.dropHint')}</p>
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".txt,.md,.json,.csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) onFiles(e.target.files);
            }}
          />
          <label
            htmlFor="file-upload"
            className="mt-3 inline-flex h-8 cursor-pointer items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('selectFiles')}
          </label>
        </div>

        {isIndexing && (
          <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <Spinner className="size-3.5" />
                {t('center.indexing')}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{indexProgress}%</span>
            </div>
            <Progress value={indexProgress} className="h-1.5 bg-muted" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default KnowledgeListPanel;
