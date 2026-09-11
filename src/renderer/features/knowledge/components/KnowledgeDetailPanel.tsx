/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 知识库详情/编辑面板（从 StepKnowledgeEnhanced 抽出）。 */
import React from 'react';
import { useTranslation, i18n } from '@/i18n';
import { type KnowledgeCategory, type KnowledgeItem } from '../../../../shared/types';
import { Card } from '@/shared/ui/Card';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatBytes, formatDateTime } from '@/shared/utils/format';
import { Calendar, FileText, PenLine, Tag } from 'lucide-react';

const CATEGORIES: KnowledgeCategory[] = ['inspiration', 'character', 'outline', 'chapter', 'writing'];

interface KnowledgeDetailPanelProps {
  viewingItem: KnowledgeItem | null;
  editName: string;
  editContent: string;
  editCategory: KnowledgeCategory;
  isDirty: boolean;
  onNameChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onCategoryChange: (value: KnowledgeCategory) => void;
  onSave: () => void;
}

export const KnowledgeDetailPanel: React.FC<KnowledgeDetailPanelProps> = ({
  viewingItem,
  editName,
  editContent,
  editCategory,
  isDirty,
  onNameChange,
  onContentChange,
  onCategoryChange,
  onSave,
}) => {
  const { t } = useTranslation('knowledge');
  return (
    <Card className="col-span-2 flex flex-col overflow-hidden">
      <div className="flex flex-none items-center justify-between gap-2 border-b border-border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">
          {viewingItem ? t('center.editTitle') : t('center.selectToEdit')}
        </h3>
        {viewingItem && (
          <div className="flex items-center gap-2">
            <Select
              value={editCategory}
              onChange={(e) => onCategoryChange(e.target.value as KnowledgeCategory)}
              className="h-8 w-auto text-sm"
            >
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{t(`category.${category}`)}</option>
              ))}
            </Select>
            <Button size="sm" onClick={onSave} disabled={!isDirty}>
              {t('center.saveChanges')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {viewingItem ? (
          <div className="flex h-full flex-col">
            <div className="flex-none border-b border-border p-4">
              <Input
                value={editName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={t('center.titlePlaceholder')}
                className="font-serif text-lg"
              />
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  <span className="tabular-nums">{formatBytes(viewingItem.size)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {formatDateTime(viewingItem.addedAt, i18n.language)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Tag className="size-3.5" />
                  {viewingItem.type.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <Textarea
                value={editContent}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder={t('center.contentPlaceholder')}
                className="h-full min-h-[300px] w-full resize-none rounded-none border-0 bg-transparent font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={PenLine}
              title={t('center.emptyEditor')}
              description={t('center.emptyEditorHint')}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default KnowledgeDetailPanel;
