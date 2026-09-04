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
import type { AppTheme, ModelConfig, Project } from '../../../shared/types';
import { resolveTheme } from '@/shared/services/themeService';
import { Button } from '@/shared/ui/Button';
import {
  BookOpen,
  ChevronRight,
  Cpu,
  Eraser,
  History,
  ListOrdered,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
  Users,
} from 'lucide-react';

interface WorkspaceTopbarProps {
  project: Project | null;
  activeModel: ModelConfig | undefined;
  theme: AppTheme | undefined;
  onThemeChange: (theme: AppTheme) => void;
  onOpenBookshelf: () => void;
  onOpenSettings: () => void;
  onClearProject: () => void;
  onDeleteProject: () => void;
  onOpenHistory: () => void;
  onOpenVersionCheck: () => void;
}

/** 单书工作台顶栏：书名面包屑 + 项目操作 + 统计 + 主题/版本/历史/模型入口。 */
const WorkspaceTopbar: React.FC<WorkspaceTopbarProps> = ({
  project,
  activeModel,
  theme,
  onThemeChange,
  onOpenBookshelf,
  onOpenSettings,
  onClearProject,
  onDeleteProject,
  onOpenHistory,
  onOpenVersionCheck,
}) => {
  const { t } = useTranslation(['app', 'nav']);
  const isDark = resolveTheme(theme) === 'dark';
  const hasHistory =
    !!project &&
    (project.chapters.some(c => (c.history?.length ?? 0) > 0) ||
      (project.virtualChapters ?? []).some(c => (c.history?.length ?? 0) > 0));

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4">
      {/* 面包屑：书籍库 / 书名 */}
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={onOpenBookshelf}
          className="shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {t('nav:bookshelf')}
        </button>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
        <h2 className="truncate font-serif text-base font-medium text-foreground">
          {project?.title || t('app:topbar.noBookSelected')}
        </h2>
        {project && (
          <div className="ml-1 flex shrink-0 items-center">
            <button
              type="button"
              onClick={onClearProject}
              title={t('app:topbar.clearProjectTip')}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <Eraser className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onDeleteProject}
              title={t('app:topbar.deleteProjectTip')}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 右侧工具区 */}
      <div className="flex shrink-0 items-center gap-2">
        {project && (
          <div className="mr-1 hidden items-center gap-3 text-xs text-muted-foreground md:flex">
            <span className="flex items-center gap-1" title={t('app:topbar.statKnowledge')}>
              <BookOpen className="size-3.5" />
              {project.knowledge?.length || 0}
            </span>
            <span className="flex items-center gap-1" title={t('app:topbar.statCharacters')}>
              <Users className="size-3.5" />
              {project.characters.length}
            </span>
            <span className="flex items-center gap-1" title={t('app:topbar.statChapters')}>
              <ListOrdered className="size-3.5" />
              {project.chapters.length}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
          title={isDark ? t('app:topbar.themeToLight') : t('app:topbar.themeToDark')}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <div className="flex items-center gap-1">
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            v{__APP_VERSION__}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={onOpenVersionCheck}
            title={t('app:topbar.checkUpdateTip')}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>

        {hasHistory && (
          <Button variant="outline" size="sm" onClick={onOpenHistory} title={t('app:topbar.viewHistoryTip')}>
            <History className="size-3.5" />
            {t('app:topbar.history')}
          </Button>
        )}

        <Button variant="secondary" size="sm" onClick={onOpenSettings}>
          <Cpu className="size-3.5" />
          <span className="max-w-32 truncate">{activeModel?.name || t('app:model.noneSelected')}</span>
        </Button>
      </div>
    </header>
  );
};

export default WorkspaceTopbar;
