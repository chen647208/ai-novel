/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 知识库世界要素统计（世界观/地点/势力/时间线/规则五格）。 */
import { Clock, Flag, Globe, MapPinned, Settings2 } from 'lucide-react';
import React from 'react';

import { useTranslation } from '@/i18n';
import { cn } from '@/shared/utils/cn';

import type { Project } from '../../../../shared/types';

export const KnowledgeStatsGrid: React.FC<{ project: Project }> = ({ project }) => {
  const { t } = useTranslation('knowledge');
  const stats = [
    { icon: Globe, label: t('center.statsWorldview'), value: project.worldView ? t('center.set') : t('center.unset'), active: !!project.worldView },
    { icon: MapPinned, label: t('center.statsLocation'), value: project.locations?.length ? t('center.countUnit', { count: project.locations.length }) : t('center.notDefined'), active: !!project.locations?.length },
    { icon: Flag, label: t('center.statsFaction'), value: project.factions?.length ? t('center.countUnit', { count: project.factions.length }) : t('center.notDefined'), active: !!project.factions?.length },
    { icon: Clock, label: t('center.statsTimeline'), value: project.timeline?.events?.length ? t('center.eventsCount', { count: project.timeline.events.length }) : t('center.notDefined'), active: !!project.timeline?.events?.length },
    { icon: Settings2, label: t('center.statsRule'), value: project.ruleSystems?.length ? t('center.countUnit', { count: project.ruleSystems.length }) : t('center.notDefined'), active: !!project.ruleSystems?.length },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map(({ icon: Icon, label, value, active }) => (
        <div
          key={label}
          className={cn(
            'flex items-center gap-3 rounded-lg border p-4 transition-colors',
            active ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
          )}
        >
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <Icon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium leading-tight">{label}</h4>
            <p className="truncate text-xs text-muted-foreground">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
