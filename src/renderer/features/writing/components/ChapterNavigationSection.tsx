/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChapterNavigationSectionProps } from '../types';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ChevronRight, Trash2 } from 'lucide-react';

const ChapterNavigationSection: React.FC<ChapterNavigationSectionProps> = ({
  chapters,
  activeChapterId,
  onChapterClick,
  onDeleteChapter,
}) => {
  const { t } = useTranslation('writing');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = chapters
    .slice()
    .sort((firstChapter, secondChapter) => firstChapter.order - secondChapter.order)
    .filter((chapter) => !q || chapter.title.toLowerCase().includes(q));
  return (
    <section>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('navigation.title')}</h4>
      {chapters.length > 5 && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('navigation.searchPlaceholder')}
          className="mb-2 h-8 text-xs"
        />
      )}
      <div className="space-y-1">
        {visible.map((chapter) => (
            <div
              key={chapter.id}
              onClick={() => onChapterClick(chapter)}
              className={cn(
                'group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs transition-colors',
                activeChapterId === chapter.id
                  ? 'bg-primary/5 font-medium text-foreground ring-1 ring-inset ring-primary/40'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="flex-1 truncate">{t('navigation.chapterEntry', { num: chapter.order + 1, title: chapter.title })}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChapter(chapter.id);
                }}
                title={t('navigation.deleteTitle', { title: chapter.title })}
              >
                <Trash2 className="size-3.5" />
              </Button>
              {activeChapterId !== chapter.id && <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-50" />}
            </div>
          ))}
      </div>
    </section>
  );
};

export default ChapterNavigationSection;
