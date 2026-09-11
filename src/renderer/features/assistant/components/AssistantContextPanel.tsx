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
import { templateDisplayName } from '@/i18n';
import type { Project, PromptTemplate } from '../../../../shared/types';
import type { AssistantCategory } from '../types';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { TabBar } from '@/shared/ui/TabBar';
import { BookOpenText, Lightbulb, ListOrdered, ListTree, Users, WandSparkles, type LucideIcon } from 'lucide-react';

interface AssistantContextPanelProps {
  project: Project | null;
  activeCategory: AssistantCategory;
  subSelectionId: string;
  analysisPromptId: string;
  prompts: PromptTemplate[];
  contextContent: string;
  isLoading: boolean;
  hasModel: boolean;
  onCategoryChange: (category: AssistantCategory) => void;
  onSubSelectionChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onAnalyze: () => void;
}

const categoryItems: Array<{ id: AssistantCategory; icon: LucideIcon; labelKey: 'category.inspiration' | 'category.knowledge' | 'category.characters' | 'category.outline' | 'category.chapters' }> = [
  { id: 'inspiration', icon: Lightbulb, labelKey: 'category.inspiration' },
  { id: 'knowledge', icon: BookOpenText, labelKey: 'category.knowledge' },
  { id: 'characters', icon: Users, labelKey: 'category.characters' },
  { id: 'outline', icon: ListTree, labelKey: 'category.outline' },
  { id: 'chapters', icon: ListOrdered, labelKey: 'category.chapters' },
];

const AssistantContextPanel: React.FC<AssistantContextPanelProps> = ({
  project,
  activeCategory,
  subSelectionId,
  analysisPromptId,
  prompts,
  contextContent,
  isLoading,
  hasModel,
  onCategoryChange,
  onSubSelectionChange,
  onPromptChange,
  onAnalyze,
}) => {
  const { t } = useTranslation('assistant');
  return (
    <div className="absolute inset-0 top-[88px] z-10 flex flex-1 flex-col overflow-hidden bg-background">
      <TabBar
        variant="block"
        value={activeCategory}
        onChange={(id) => { onCategoryChange(id); onSubSelectionChange('all'); }}
        items={categoryItems.map((c) => ({ id: c.id, icon: c.icon, label: t(c.labelKey) }))}
      />

      {(activeCategory === 'knowledge' || activeCategory === 'chapters') && project && (
        <div className="shrink-0 border-b border-border bg-card px-4 py-2">
          <Select
            className="h-7 w-full text-xs"
            value={subSelectionId}
            onChange={(e) => onSubSelectionChange(e.target.value)}
          >
            <option value="all">{t('context.viewAllOption')}</option>
            {activeCategory === 'knowledge' && project.knowledge?.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
            {activeCategory === 'chapters' && [...(project.chapters ?? [])].sort((a, b) => a.order - b.order).map((chapter) => (
              <option key={chapter.id} value={chapter.id}>{t('context.chapterEntry', { num: chapter.order + 1, title: chapter.title })}</option>
            ))}
          </Select>
        </div>
      )}

      <div className=" flex-1 overflow-y-auto p-4">
        <Textarea
          readOnly
          className="h-full min-h-full bg-card text-xs leading-relaxed"
          value={contextContent}
        />
      </div>

      <div className="shrink-0 space-y-2 border-t border-border bg-card p-3">
        <Select
          className="h-8 w-full text-xs"
          value={analysisPromptId}
          onChange={(e) => onPromptChange(e.target.value)}
        >
          <option value="">{t('context.selectPromptOption')}</option>
          {prompts.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>[{prompt.category}] {templateDisplayName(prompt)}</option>
          ))}
        </Select>
        <Button className="w-full" size="sm" onClick={onAnalyze} disabled={isLoading || !hasModel || !project || !contextContent.trim()} title={!hasModel ? t('dialog.noModel') : undefined}>
          <WandSparkles className="size-4" /> {t('context.analyzeBtn')}
        </Button>
      </div>
    </div>
  );
};

export default AssistantContextPanel;
