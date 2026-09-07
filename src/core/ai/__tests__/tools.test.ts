/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { ToolRegistry, lintToolSchema, type ToolSpec } from '../tools.js';

const tool = (id: string, over: Partial<ToolSpec> = {}): ToolSpec => ({
  id,
  description: `${id} 的描述`,
  parameters: { type: 'object', properties: { x: { type: 'string' } }, required: ['x'] },
  permission: 'read',
  execute: async () => ({ ok: true, data: { id } }),
  ...over,
});

describe('ToolRegistry', () => {
  it('注册/获取/列出工具', () => {
    const reg = new ToolRegistry();
    reg.register(tool('core.a')).register(tool('core.b', { permission: 'write:proposal' }));

    expect(reg.has('core.a')).toBe(true);
    expect(reg.get('core.a')?.permission).toBe('read');
    expect(reg.list()).toHaveLength(2);
    expect(reg.list({ permission: 'write:proposal' }).map((t) => t.id)).toEqual(['core.b']);
  });

  it('重复注册抛错', () => {
    const reg = new ToolRegistry();
    reg.register(tool('core.a'));
    expect(() => reg.register(tool('core.a'))).toThrow(/重复注册/);
  });

  it('schema lint：非 object / 缺 properties / required 越界都被拒绝', () => {
    const reg = new ToolRegistry();
    expect(() => reg.register(tool('bad1', { parameters: { type: 'string' } }))).toThrow(/object/);
    expect(() => reg.register(tool('bad2', { parameters: { type: 'object' } }))).toThrow(/properties/);
    expect(() =>
      reg.register(tool('bad3', { parameters: { type: 'object', properties: {}, required: ['x'] } })),
    ).toThrow(/required/);
    expect(lintToolSchema('ok', { type: 'object', properties: { x: {} }, required: ['x'] })).toBeNull();
  });

  it('执行：未知工具与取消返回失败输出而非抛错', async () => {
    const reg = new ToolRegistry();
    reg.register(tool('core.ok'));

    const unknown = await reg.execute('core.missing', {});
    expect(unknown.ok).toBe(false);
    expect(unknown.error).toContain('未知工具');

    const aborted = await reg.execute('core.ok', {}, { signal: AbortSignal.abort() });
    expect(aborted.ok).toBe(false);
    expect(aborted.error).toContain('已取消');
  });

  it('执行：工具抛错被捕获为 ToolOutput.error', async () => {
    const reg = new ToolRegistry();
    reg.register(
      tool('core.boom', {
        execute: async () => {
          throw new Error('炸了');
        },
      }),
    );
    const out = await reg.execute('core.boom', {});
    expect(out.ok).toBe(false);
    expect(out.error).toBe('炸了');
  });

  it('resolveSchemas 输出 prompt 注入形状并支持白名单', () => {
    const reg = new ToolRegistry();
    reg.register(tool('core.a')).register(tool('core.b'));

    const all = reg.resolveSchemas();
    expect(all).toHaveLength(2);
    expect(all[0]).toEqual({ id: 'core.a', description: 'core.a 的描述', parameters: expect.any(String) });

    const picked = reg.resolveSchemas(['core.b']);
    expect(picked.map((s) => s.id)).toEqual(['core.b']);
  });

  it('注销工具', () => {
    const reg = new ToolRegistry();
    reg.register(tool('core.a'));
    expect(reg.unregister('core.a')).toBe(true);
    expect(reg.has('core.a')).toBe(false);
  });
});
