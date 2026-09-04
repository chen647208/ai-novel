/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation } from '@/i18n';
import type { Project } from '../../../shared/types';
import { cn } from '@/shared/utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/Tooltip';
import { Feather, Globe, Library, ListOrdered, ListTree, PenLine, Settings2, Users } from 'lucide-react';

/** 工作台分区标识；与旧线性向导解耦，可自由切换。 */
export type SectionId = 'inspiration' | 'world' | 'characters' | 'outline' | 'chapters' | 'writing';

/** 分区标签的 i18n 键（字面量联合，满足 typed-i18n 校验）。 */
type SectionLabelKey =
  | 'steps.inspiration'
  | 'steps.world'
  | 'steps.characters'
  | 'steps.outline'
  | 'steps.chapterOutline'
  | 'steps.writing';

interface SectionDef {
  id: SectionId;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: SectionLabelKey;
  /** 分区是否已有内容（驱动完成状态点）。 */
  done: (p: Project) => boolean;
}

export const WORKSPACE_SECTIONS: readonly SectionDef[] = [
  { id: 'inspiration', icon: PenLine, labelKey: 'steps.inspiration', done: p => !!(p.inspiration || p.intro) },
  { id: 'world', icon: Globe, labelKey: 'steps.world', done: p => (p.knowledge?.length ?? 0) > 0 || !!p.worldView },
  { id: 'characters', icon: Users, labelKey: 'steps.characters', done: p => p.characters.length > 0 },
  { id: 'outline', icon: ListTree, labelKey: 'steps.outline', done: p => !!p.outline },
  { id: 'chapters', icon: ListOrdered, labelKey: 'steps.chapterOutline', done: p => p.chapters.length > 0 },
  { id: 'writing', icon: Feather, labelKey: 'steps.writing', done: p => p.chapters.some(c => !!c.content) },
];

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

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3">
      {/* 品牌标识 */}
      <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Feather className="size-4" />
      </div>

      {/* 返回书籍库 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onOpenBookshelf}
            aria-label={t('bookshelf')}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Library className="size-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{t('bookshelf')}</TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-border" />

      {/* 分区导航 */}
      <nav className="flex flex-1 flex-col items-center gap-1">
        {WORKSPACE_SECTIONS.map(section => {
          const active = activeSection === section.id;
          const done = project ? section.done(project) : false;
          return (
            <Tooltip key={section.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  aria-label={t(section.labelKey)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex size-10 items-center justify-center rounded-lg transition-colors',
                    active
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <section.icon className="size-5" />
                  {done && (
                    <span
                      className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-success"
                      aria-hidden
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t(section.labelKey)}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* 设置 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={t('settings')}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="size-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{t('settings')}</TooltipContent>
      </Tooltip>
    </aside>
  );
};

export default WorkspaceNav;
