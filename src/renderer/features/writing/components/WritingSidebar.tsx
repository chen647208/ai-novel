/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { roleLabel } from '../../characters/displayLabels';
import ChapterNavigationSection from './ChapterNavigationSection';
import ChapterSummarySection from './ChapterSummarySection';
import type { WritingSidebarProps } from '../types';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { ChevronsLeft } from 'lucide-react';

const WritingSidebar: React.FC<WritingSidebarProps> = ({
  characters,
  activeChapter,
  activeChapterId,
  chapters,
  summaryPrompts,
  selectedSummaryPromptId,
  isExtractingSummary,
  hasModel,
  onClose,
  onChapterSummaryChange,
  onOpenSummaryPromptManager,
  onContentSummaryChange,
  onSummaryPromptChange,
  onExtractSummary,
  onChapterClick,
}) => {
  const { t } = useTranslation('writing');
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">{t('sidebar.title')}</h3>
        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onClose}>
          <ChevronsLeft className="size-4" />
        </Button>
      </div>
      <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('sidebar.charactersTitle')}</h4>
          {characters.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">{t('sidebar.noCharacters')}</p>
          ) : (
            <div className="space-y-2">
              {characters.map((character) => (
                <div key={character.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-serif font-medium">{character.name}</span>
                    <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-2xs uppercase text-muted-foreground">{roleLabel(character.role)}</span>
                  </div>
                  <div className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {character.personality || character.background}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('sidebar.outlineTitle')}</h4>
          <Textarea
            value={activeChapter?.summary || ''}
            onChange={(event) => onChapterSummaryChange(event.target.value)}
            placeholder={t('sidebar.outlinePlaceholder')}
            className="min-h-[120px] bg-muted/40 text-xs leading-relaxed whitespace-pre-wrap"
          />
        </section>

        <ChapterSummarySection
          activeChapter={activeChapter}
          summaryPrompts={summaryPrompts}
          selectedSummaryPromptId={selectedSummaryPromptId}
          isExtractingSummary={isExtractingSummary}
          hasModel={hasModel}
          onOpenSummaryPromptManager={onOpenSummaryPromptManager}
          onContentSummaryChange={onContentSummaryChange}
          onSummaryPromptChange={onSummaryPromptChange}
          onExtractSummary={onExtractSummary}
        />

        <ChapterNavigationSection
          chapters={chapters}
          activeChapterId={activeChapterId}
          onChapterClick={onChapterClick}
        />
      </div>
    </div>
  );
};

export default WritingSidebar;
