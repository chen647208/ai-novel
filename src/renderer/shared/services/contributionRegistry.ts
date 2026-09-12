/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 统一贡献注册表引擎（docs/design/04 §13）。
 *
 * 各扩展点（命令、设置页签、UI 槽位…）共用同一套「注册返回 Disposable + 按 order 排序 + 引用稳定快照」语义，
 * 不再各写一份 Map/订阅/缓存。具体扩展点继承本类并声明 kind。
 */
export interface ContributionItem {
  id: string;
  order?: number;
}

type Listener<T> = (items: T[]) => void;

export class ContributionRegistry<T extends ContributionItem> {
  private readonly entries = new Map<string, T>();
  private readonly listeners = new Set<Listener<T>>();
  private snapshot: T[] | null = null;

  constructor(readonly kind: string) {}

  register(item: T): () => void {
    this.entries.set(item.id, item);
    this.bump();
    return () => {
      this.entries.delete(item.id);
      this.bump();
    };
  }

  unregister(id: string): void {
    if (this.entries.delete(id)) this.bump();
  }

  list(): T[] {
    if (!this.snapshot) {
      this.snapshot = [...this.entries.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return this.snapshot;
  }

  get(id: string): T | undefined {
    return this.entries.get(id);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private bump(): void {
    this.snapshot = null;
    const items = this.list();
    for (const listener of this.listeners) listener(items);
  }
}
