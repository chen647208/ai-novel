/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from '@/i18n';
import type { Project } from '../../../shared/types';
import { useFeatureAvailability } from '../useFeatureAvailability';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/Button';
import { isSectionVisible } from '../sectionFeatures';
import { WORKSPACE_SECTIONS, type SectionId } from '../sections';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/Tooltip';
import { Feather, Library, Settings2 } from 'lucide-react';

interface WorkspaceNavProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
  onOpenBookshelf: () => void;
  onOpenSettings: () => void;
  project: Project | null;
}

/** 单书工作台左侧图标栏：分区自由切换 + 完成状态点 + 书籍库/设置入口。 */
const WorkspaceNav: React.FC<WorkspaceNavProps> = ({
  activeSection,
  onSectionChange,
  onOpenBookshelf,
  onOpenSettings,
  project,
}) => {
  const { t } = useTranslation('nav');
  const availableFeatures = useFeatureAvailability();
  // structure 取 chapters 与 outline 的并集：任一可用即显示（单源见 isSectionVisible）
  const visibleSections = WORKSPACE_SECTIONS.filter((section) => isSectionVisible(section.id, (id) => availableFeatures.has(id)));

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3">
      {/* 品牌标识 */}
      <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Feather className="size-4" />
      </div>

      {/* 返回书籍库 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenBookshelf}
            aria-label={t('bookshelf')}
            className="size-10 rounded-lg text-muted-foreground hover:text-foreground [&_svg]:size-5"
          >
            <Library className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{t('bookshelf')}</TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-border" />

      {/* 分区导航 */}
      <nav className="flex flex-1 flex-col items-center gap-1">
        {visibleSections.map(section => {
          const active = activeSection === section.id;
          const done = project ? section.done(project) : false;
          return (
            <Tooltip key={section.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSectionChange(section.id)}
                  aria-label={t(section.labelKey)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative size-10 rounded-lg text-muted-foreground hover:text-foreground [&_svg]:size-5',
                    active && 'bg-accent text-foreground'
                  )}
                >
                  <section.icon className="size-5" />
                  {done && (
                    <span
                      className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-success"
                      aria-hidden
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t(section.labelKey)}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* 设置 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            aria-label={t('settings')}
            className="size-10 rounded-lg text-muted-foreground hover:text-foreground [&_svg]:size-5"
          >
            <Settings2 className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{t('settings')}</TooltipContent>
      </Tooltip>
    </aside>
  );
};

export default WorkspaceNav;
