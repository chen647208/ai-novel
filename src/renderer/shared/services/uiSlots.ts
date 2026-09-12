/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * UI 槽位注册表（docs/design/04 §13）：应用壳在固定位置渲染 `<Slot id>`，功能/插件注册节点即可插入。
 * 存储与订阅复用统一贡献注册表引擎；本类只加"按槽过滤 + 每槽快照缓存"。
 */
import type React from 'react';

import { ContributionRegistry } from './contributionRegistry';

export type SlotId =
  | 'topbar.actions'
  | 'nav.actions'
  | 'sidebar.actions'
  | 'editor.toolbar'
  | 'status-bar'
  | 'plugin.panel'
  | 'plugin.editor';

export interface SlotContribution {
  id: string;
  slot: SlotId;
  /** 同槽内排序，小者在前。 */
  order?: number;
  render: () => React.ReactNode;
}

export class UiSlotRegistry extends ContributionRegistry<SlotContribution> {
  private readonly slotCache = new Map<SlotId, SlotContribution[]>();

  constructor() {
    super('uiSlots');
  }

  override register(contribution: SlotContribution): () => void {
    const dispose = super.register(contribution);
    this.slotCache.clear();
    return () => {
      dispose();
      this.slotCache.clear();
    };
  }

  override unregister(id: string): void {
    super.unregister(id);
    this.slotCache.clear();
  }

  /** 按槽返回排序后的贡献；缓存保证 useSyncExternalStore 引用稳定。 */
  getSnapshot(slot: SlotId): SlotContribution[] {
    const cached = this.slotCache.get(slot);
    if (cached) return cached;
    const ordered = this.list().filter((c) => c.slot === slot);
    this.slotCache.set(slot, ordered);
    return ordered;
  }
}

export const uiSlotRegistry = new UiSlotRegistry();
