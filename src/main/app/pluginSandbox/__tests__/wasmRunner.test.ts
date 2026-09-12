/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import { runWasm } from '../wasmRunner.js';

/** 手写 WASM 模块：导出 run，返回 i32 42。 */
const RUN_42 = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x07, 0x01, 0x03, 0x72, 0x75, 0x6e, 0x00, 0x00,
  0x0a, 0x06, 0x01, 0x04, 0x00, 0x41, 0x2a, 0x0b,
]);

const RUN_42_B64 = Buffer.from(RUN_42).toString('base64');

/** 手写 WASM：导入 env.now() -> f64，导出 run() -> f64（返回 now）。 */
const RUN_NOW = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7c,
  0x02, 0x0b, 0x01, 0x03, 0x65, 0x6e, 0x76, 0x03, 0x6e, 0x6f, 0x77, 0x00, 0x00,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x07, 0x01, 0x03, 0x72, 0x75, 0x6e, 0x00, 0x01,
  0x0a, 0x06, 0x01, 0x04, 0x00, 0x10, 0x00, 0x0b,
]);
const RUN_NOW_B64 = Buffer.from(RUN_NOW).toString('base64');

describe('runWasm（S2 无导入纯计算）', () => {
  it('执行导出 run 并返回结果', async () => {
    const result = await runWasm({ code: '', mode: 'wasm', moduleBase64: RUN_42_B64 });
    expect(result).toEqual({ ok: true, output: 42 });
  });

  it('缺少模块报 runtime', async () => {
    const result = await runWasm({ code: '', mode: 'wasm' });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('runtime');
  });

  it('非法 base64 报 runtime', async () => {
    const result = await runWasm({ code: '', mode: 'wasm', moduleBase64: '!!!not-base64!!!' });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('runtime');
  });

  it('编译失败报 runtime', async () => {
    const result = await runWasm({ code: '', mode: 'wasm', moduleBase64: Buffer.from('nope').toString('base64') });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('runtime');
  });

  it('未授权导入被拒（默认拒绝）', async () => {
    const result = await runWasm({ code: '', mode: 'wasm', moduleBase64: RUN_NOW_B64 });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('capability');
  });

  it('授权宿主函数后可执行（env.now）', async () => {
    const result = await runWasm({
      code: '',
      mode: 'wasm',
      moduleBase64: RUN_NOW_B64,
      hostFunctions: [{ module: 'env', name: 'now', kind: 'now' }],
    });
    expect(result.ok).toBe(true);
    expect(typeof result.output).toBe('number');
  });

  it('声明导入但缺少实现：capability 错误', async () => {
    const result = await runWasm({
      code: '',
      mode: 'wasm',
      moduleBase64: RUN_NOW_B64,
      allowedImports: ['env.now'],
    });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('capability');
    expect(result.error?.message).toContain('缺少宿主函数实现');
  });
});
