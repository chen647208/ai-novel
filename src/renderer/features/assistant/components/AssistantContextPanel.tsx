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
import { templateDisplayName } from '@/i18n';
import type { Project, PromptTemplate } from '../../../../shared/types';
import type { AssistantCategory } from '../types';
import { BookOpenText, Lightbulb, ListOrdered, ListTree, Users, WandSparkles, type LucideIcon } from 'lucide-react';

interface AssistantContextPanelProps {
  project: Project | null;
  activeCategory: AssistantCategory;
  subSelectionId: string;
  analysisPromptId: string;
  prompts: PromptTemplate[];
  contextContent: string;
  isLoading: boolean;
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
  onCategoryChange,
  onSubSelectionChange,
  onPromptChange,
  onAnalyze,
}) => {
  const { t } = useTranslation('assistant');
  return (
    <div className="flex-1 flex flex-col bg-gray-50 z-10 overflow-hidden animate-in slide-in-from-right duration-200 absolute inset-0 top-[88px]">
      <div className="flex bg-white border-b overflow-x-auto no-scrollbar shrink-0">
        {categoryItems.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              onCategoryChange(category.id);
              onSubSelectionChange('all');
            }}
            className={`flex-1 min-w-[60px] py-3 flex flex-col items-center gap-1 text-[10px] border-b-2 transition-colors ${
              activeCategory === category.id ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <category.icon className="size-4" />
            <span>{t(category.labelKey)}</span>
          </button>
        ))}
      </div>

      {(activeCategory === 'knowledge' || activeCategory === 'chapters') && project && (
        <div className="px-4 py-2 bg-white border-b shrink-0">
          <select
            value={subSelectionId}
            onChange={(e) => onSubSelectionChange(e.target.value)}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
          >
            <option value="all">{t('context.viewAllOption')}</option>
            {activeCategory === 'knowledge' && project.knowledge?.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
            {activeCategory === 'chapters' && project.chapters?.sort((a, b) => a.order - b.order).map((chapter) => (
              <option key={chapter.id} value={chapter.id}>{t('context.chapterEntry', { num: chapter.order + 1, title: chapter.title })}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <textarea
          readOnly
          className="w-full h-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-600 leading-relaxed resize-none outline-none focus:ring-1 focus:ring-blue-100"
          value={contextContent}
        />
      </div>

      <div className="p-3 bg-white border-t border-gray-200 shrink-0 space-y-2">
        <div className="flex gap-2">
          <select
            value={analysisPromptId}
            onChange={(e) => onPromptChange(e.target.value)}
            className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 outline-none"
          >
            <option value="">{t('context.selectPromptOption')}</option>
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>[{prompt.category}] {templateDisplayName(prompt)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onAnalyze}
          disabled={isLoading || !project}
          className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <WandSparkles className="size-4" /> {t('context.analyzeBtn')}
        </button>
      </div>
    </div>
  );
};

export default AssistantContextPanel;

