/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { lintToolSchema, ToolRegistry, type ToolSpec, validateToolArgs } from '../tools.js';

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

  it('执行：未知工具与取消返回失败输出', async () => {
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
    const out = await reg.execute('core.boom', { x: 'v' });
    expect(out.ok).toBe(false);
    expect(out.error).toBe('炸了');
  });

  it('执行：缺必填/类型不符在入参校验即失败', async () => {
    const reg = new ToolRegistry();
    reg.register(tool('core.strict'));
    const missing = await reg.execute('core.strict', {});
    expect(missing.ok).toBe(false);
    expect(missing.error).toContain('缺少必填参数');
    const wrongType = await reg.execute('core.strict', { x: 123 });
    expect(wrongType.ok).toBe(false);
    expect(wrongType.error).toContain('类型应为 string');
  });

  it('validateToolArgs：类型与必填矩阵', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' }, c: { type: 'integer' }, d: { type: 'boolean' }, e: { type: 'array' } },
      required: ['a'],
    };
    expect(validateToolArgs('t', schema, { a: 'x', b: 1, c: 2, d: true, e: [] })).toBeNull();
    expect(validateToolArgs('t', schema, {})).toContain('缺少必填参数');
    expect(validateToolArgs('t', schema, { a: 1 })).toContain('类型应为 string');
    expect(validateToolArgs('t', schema, { a: 'x', c: 1.5 })).toContain('类型应为 integer');
    expect(validateToolArgs('t', schema, 'nope')).toContain('必须是对象');
    expect(validateToolArgs('t', { type: 'object', properties: {} }, undefined)).toBeNull();
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
