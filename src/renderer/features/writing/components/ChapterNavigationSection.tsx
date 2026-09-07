/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ChapterNavigationSectionProps } from '../types';
import { cn } from '@/shared/utils/cn';
import { ChevronRight } from 'lucide-react';

const ChapterNavigationSection: React.FC<ChapterNavigationSectionProps> = ({
  chapters,
  activeChapterId,
  onChapterClick,
}) => {
  const { t } = useTranslation('writing');
  return (
    <section>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('navigation.title')}</h4>
      <div className="space-y-1">
        {chapters
          .slice()
          .sort((firstChapter, secondChapter) => firstChapter.order - secondChapter.order)
          .map((chapter) => (
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
              {activeChapterId !== chapter.id && <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-50" />}
            </div>
          ))}
      </div>
    </section>
  );
};

export default ChapterNavigationSection;
