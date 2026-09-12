/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it, vi } from 'vitest';

import { ContributionRegistry } from '../contributionRegistry';

interface Item {
  id: string;
  order?: number;
}

describe('ContributionRegistry（§13 统一引擎）', () => {
  it('按 order 排序，注册/解绑可逆', () => {
    const registry = new ContributionRegistry<Item>('test');
    registry.register({ id: 'b', order: 2 });
    const disposeA = registry.register({ id: 'a', order: 1 });
    expect(registry.list().map((i) => i.id)).toEqual(['a', 'b']);
    disposeA();
    expect(registry.list().map((i) => i.id)).toEqual(['b']);
  });

  it('快照引用稳定：未变更时 list 返回同一引用', () => {
    const registry = new ContributionRegistry<Item>('test');
    registry.register({ id: 'a' });
    expect(registry.list()).toBe(registry.list());
  });

  it('变更后快照失效并通知订阅者', () => {
    const registry = new ContributionRegistry<Item>('test');
    const listener = vi.fn();
    const unsub = registry.subscribe(listener);
    const first = registry.list();
    const dispose = registry.register({ id: 'a' });
    expect(registry.list()).not.toBe(first);
    expect(listener).toHaveBeenLastCalledWith([{ id: 'a' }]);
    dispose();
    expect(listener).toHaveBeenLastCalledWith([]);
    unsub();
    registry.register({ id: 'b' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('get/has/unregister', () => {
    const registry = new ContributionRegistry<Item>('test');
    registry.register({ id: 'a' });
    expect(registry.has('a')).toBe(true);
    expect(registry.get('a')?.id).toBe('a');
    registry.unregister('a');
    expect(registry.has('a')).toBe(false);
    registry.unregister('missing');
  });
});
