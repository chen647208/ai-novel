/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 状态栏统计（槽位贡献）：从 store 读取活动书，显示章节数/字数，无 props。 */
import React from 'react';
import { useTranslation } from '@/i18n';
import { useProjectStore, selectActiveProject } from '@/app/stores/projectStore';

export const StatusBarStats: React.FC = () => {
  const { t } = useTranslation('app');
  const project = useProjectStore(selectActiveProject);
  if (!project) return null;
  const chapters = project.chapters ?? [];
  const words = chapters.reduce((sum, c) => sum + (c.content?.replace(/\s/g, '').length ?? 0), 0);
  return (
    <div className="flex items-center gap-3 text-2xs text-muted-foreground">
      <span>{t('statusBar.chapters', { count: chapters.length })}</span>
      <span className="tabular-nums">{t('statusBar.words', { count: words })}</span>
    </div>
  );
};

export default StatusBarStats;
