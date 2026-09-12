/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it } from 'vitest';

import { runQuickJS } from '../quickjsRunner.js';

describe('runQuickJS（沙箱引擎隔离 + 资源限额）', () => {
  it('执行 run(input) 并返回输出', async () => {
    const result = await runQuickJS({
      code: 'function run(input) { return { sum: input.a + input.b }; }',
      input: { a: 1, b: 2 },
    });
    expect(result.ok).toBe(true);
    expect(result.output).toEqual({ sum: 3 });
  });

  it('未定义 run 报 runtime', async () => {
    const result = await runQuickJS({ code: '1 + 1' });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('runtime');
  });

  it('代码抛错报 runtime', async () => {
    const result = await runQuickJS({ code: 'function run() { throw new Error("boom"); }' });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('runtime');
    expect(result.error?.message).toContain('boom');
  });

  it('死循环被墙钟超时中断', async () => {
    const result = await runQuickJS({
      code: 'function run() { for (;;) {} }',
      limits: { timeoutMs: 200 },
    });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('timeout');
  }, 15_000);

  it('内存炸弹被内存上限拦截', async () => {
    const result = await runQuickJS({
      code: 'function run() { let s = ""; for (;;) { s += "xxxxxxxxxxxxxxxxxxxx"; } }',
      limits: { memoryBytes: 1024 * 1024, timeoutMs: 5000 },
    });
    expect(result.ok).toBe(false);
    expect(['memory', 'timeout']).toContain(result.error?.kind);
  }, 20_000);

  it('console.* 经 onLog 回传，不泄漏宿主对象', async () => {
    const logs: Array<[string, string]> = [];
    const result = await runQuickJS(
      { code: 'function run() { console.log("hi"); return typeof globalThis.process; }' },
      (level, message) => logs.push([level, message]),
    );
    expect(result.ok).toBe(true);
    expect(logs).toContainEqual(['log', 'hi']);
    // 宿主 Node 对象不可见
    expect(result.output).toBe('undefined');
  });

  it('输出超上限报 limit', async () => {
    const result = await runQuickJS({
      code: 'function run() { return "x".repeat(1000); }',
      limits: { maxOutputBytes: 100 },
    });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('limit');
  });
});
