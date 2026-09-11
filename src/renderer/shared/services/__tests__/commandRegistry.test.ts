/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect, vi } from 'vitest';
import { CommandRegistry } from '../commandRegistry';

describe('CommandRegistry', () => {
  it('注册/列出/解绑', () => {
    const registry = new CommandRegistry();
    const dispose = registry.register({ id: 'a', title: '甲', run: () => {} });
    expect(registry.list().map((c) => c.id)).toEqual(['a']);
    dispose();
    expect(registry.list()).toEqual([]);
  });

  it('订阅在注册与解绑时收到最新快照', () => {
    const registry = new CommandRegistry();
    const listener = vi.fn();
    const unsub = registry.subscribe(listener);
    const dispose = registry.register({ id: 'a', title: '甲', run: () => {} });
    expect(listener).toHaveBeenLastCalledWith([{ id: 'a', title: '甲', run: expect.any(Function) }]);
    dispose();
    expect(listener).toHaveBeenLastCalledWith([]);
    unsub();
    registry.register({ id: 'b', title: '乙', run: () => {} });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
