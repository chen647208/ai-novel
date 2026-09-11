/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 设置页签注册表：内置与插件页签同路径。注册返回解绑函数；getSnapshot 缓存保证引用稳定。
 * 页签内容经 render(ctx) 渲染，ctx 为 SettingsTabContentProps（设置面板共用入参）。
 */
import type React from 'react';

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

type Listener = () => void;

export class SettingsTabRegistry {
  private readonly tabs = new Map<string, SettingsTabContribution>();
  private readonly listeners = new Set<Listener>();
  private snapshot: SettingsTabContribution[] | null = null;

  register(tab: SettingsTabContribution): () => void {
    this.tabs.set(tab.id, tab);
    this.bump();
    return () => {
      this.tabs.delete(tab.id);
      this.bump();
    };
  }

  list(): SettingsTabContribution[] {
    if (!this.snapshot) {
      this.snapshot = [...this.tabs.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return this.snapshot;
  }

  has(id: string): boolean {
    return this.tabs.has(id);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private bump(): void {
    this.snapshot = null;
    for (const listener of this.listeners) listener();
  }
}

export const settingsTabRegistry = new SettingsTabRegistry();
