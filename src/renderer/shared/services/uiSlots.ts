/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * UI 槽位注册表：应用壳在固定位置渲染 `<Slot id>`，功能/插件注册节点即可插入。
 * 注册返回解绑函数（可逆）；getSnapshot 按槽缓存，保证 useSyncExternalStore 引用稳定。
 */
import type React from 'react';

export type SlotId = 'topbar.actions';

export interface SlotContribution {
  id: string;
  slot: SlotId;
  /** 同槽内排序，小者在前。 */
  order?: number;
  render: () => React.ReactNode;
}

type Listener = () => void;

export class UiSlotRegistry {
  private readonly contributions = new Map<string, SlotContribution>();
  private readonly cache = new Map<SlotId, SlotContribution[]>();
  private readonly listeners = new Set<Listener>();

  register(contribution: SlotContribution): () => void {
    this.contributions.set(contribution.id, contribution);
    this.bump();
    return () => {
      this.contributions.delete(contribution.id);
      this.bump();
    };
  }

  getSnapshot(slot: SlotId): SlotContribution[] {
    const cached = this.cache.get(slot);
    if (cached) return cached;
    const ordered = [...this.contributions.values()]
      .filter((c) => c.slot === slot)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this.cache.set(slot, ordered);
    return ordered;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private bump(): void {
    this.cache.clear();
    for (const listener of this.listeners) listener();
  }
}

export const uiSlotRegistry = new UiSlotRegistry();
