/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it, vi } from 'vitest';

import { UiSlotRegistry } from '../uiSlots';

describe('UiSlotRegistry', () => {
  it('按 order 排序，未设 order 视为 0', () => {
    const r = new UiSlotRegistry();
    r.register({ id: 'b', slot: 'topbar.actions', order: 2, render: () => null });
    r.register({ id: 'a', slot: 'topbar.actions', order: 1, render: () => null });
    expect(r.getSnapshot('topbar.actions').map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('快照引用稳定：无变更时同一引用', () => {
    const r = new UiSlotRegistry();
    r.register({ id: 'a', slot: 'topbar.actions', render: () => null });
    const first = r.getSnapshot('topbar.actions');
    expect(r.getSnapshot('topbar.actions')).toBe(first);
  });

  it('解绑移除贡献并通知订阅者', () => {
    const r = new UiSlotRegistry();
    const listener = vi.fn();
    r.subscribe(listener);
    const dispose = r.register({ id: 'a', slot: 'topbar.actions', render: () => null });
    dispose();
    expect(r.getSnapshot('topbar.actions')).toEqual([]);
    expect(listener).toHaveBeenCalled();
  });
});
