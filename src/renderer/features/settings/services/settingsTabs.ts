/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 设置页签注册表：内置与插件页签同路径。注册返回解绑函数；快照按 order 排序且引用稳定。
 * 页签内容经 render(ctx) 渲染，ctx 为 SettingsTabContentProps（设置面板共用入参）。
 * 存储与订阅语义复用统一贡献注册表引擎（design/04 §13）。
 */
import type React from 'react';

import { ContributionRegistry } from '@/shared/services/contributionRegistry';

import type { SettingsTabContentProps } from '../types';

export interface SettingsTabContribution {
  id: string;
  /** 图标组件（lucide）。 */
  icon: React.ComponentType<{ className?: string }>;
  /** i18n 键（settings 命名空间）。 */
  labelKey: string;
  /** 分组标签键；留空归入“扩展”。 */
  groupLabelKey?: string;
  order?: number;
  render: (ctx: SettingsTabContentProps) => React.ReactNode;
}

export class SettingsTabRegistry extends ContributionRegistry<SettingsTabContribution> {
  constructor() {
    super('settingsTab');
  }
}

export const settingsTabRegistry = new SettingsTabRegistry();
