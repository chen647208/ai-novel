/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { createPluginContext, registeredTasks } from '../context.js';
import { EventBus } from '../events.js';

describe('PluginContext（插件间交互规范）', () => {
  it('emit 强制本插件命名空间，越域抛错', () => {
    const bus = new EventBus();
    const ctx = createPluginContext('com.acme.tool', { events: bus });
    const seen: unknown[] = [];
    bus.on('plugin.tool.scored', (p) => seen.push(p));

    ctx.events.emit('plugin.tool.scored', { score: 9 });
    expect(seen).toEqual([{ score: 9 }]);
    expect(() => ctx.events.emit('core.internal', {})).toThrow(/越域/);
    expect(() => ctx.events.emit('plugin.other.event', {})).toThrow(/越域/);
  });

  it('on 可观察全域事件（含其他插件域）', () => {
    const bus = new EventBus();
    const ctxA = createPluginContext('com.a.p', { events: bus });
    const ctxB = createPluginContext('com.b.p', { events: bus });
    const seen: string[] = [];
    ctxA.events.on('plugin.p.ready', () => seen.push('a观察'));
    ctxB.events.emit('plugin.p.ready', {});
    expect(seen).toEqual(['a观察']);
  });

  it('store 按权限裁剪：未声明域拒绝', async () => {
    const ctx = createPluginContext('com.x.p', { events: new EventBus(), permissions: { read: ['index'] } });
    await expect(ctx.store.read('manuscript', {})).rejects.toThrow('权限拒绝');
    await expect(ctx.store.read('index', {})).rejects.toThrow('适配器'); // 声明了但 v0 无适配器
  });

  it('声明权限 + 提供适配器后可读', async () => {
    const ctx = createPluginContext('com.y.p', {
      events: new EventBus(),
      permissions: { read: ['index'] },
      dataAdapter: { read: async () => [{ tag: '星辉' }] },
    });
    expect(await ctx.store.read('index', {})).toEqual([{ tag: '星辉' }]);
  });

  it('任务登记可审计', async () => {
    const ctx = createPluginContext('com.z.p', { events: new EventBus() });
    ctx.tasks.register('重建索引', Promise.resolve('done'));
    expect(registeredTasks(ctx)).toHaveLength(1);
    await registeredTasks(ctx)[0]!.done;
  });
});
