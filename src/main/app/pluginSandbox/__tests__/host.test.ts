/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it, vi } from 'vitest';

import { type SandboxChildHandle,SandboxHost } from '../host.js';

function fakeChild(respond: boolean): SandboxChildHandle & { killed: () => boolean } {
  const listeners: Array<(message: unknown) => void> = [];
  let killed = false;
  return {
    postMessage: (message) => {
      if (!respond) return;
      const id = (message as { id: string }).id;
      queueMicrotask(() => {
        for (const listener of listeners) listener({ id, result: { ok: true, output: 42 } });
      });
    },
    onMessage: (listener) => {
      listeners.push(listener);
    },
    kill: () => {
      killed = true;
    },
    killed: () => killed,
  };
}

describe('SandboxHost（进程隔离 + 兜底超时）', () => {
  it('转发请求并回传结果，结束后终止子进程', async () => {
    const child = fakeChild(true);
    const killSpy = vi.spyOn(child, 'kill');
    const host = new SandboxHost(() => child, 'child.js', 50);
    const result = await host.run({ code: 'function run(){return 42;}' });
    expect(result).toEqual({ ok: true, output: 42 });
    expect(killSpy).toHaveBeenCalled();
  });

  it('子进程无响应时兜底超时并终止', async () => {
    const child = fakeChild(false);
    const killSpy = vi.spyOn(child, 'kill');
    const host = new SandboxHost(() => child, 'child.js', 20);
    const result = await host.run({ code: '', limits: { timeoutMs: 10 } });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('timeout');
    expect(killSpy).toHaveBeenCalled();
  });

  it('fork 抛错时报 runtime', async () => {
    const host = new SandboxHost(() => {
      throw new Error('spawn fail');
    }, 'child.js');
    const result = await host.run({ code: '' });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('runtime');
  });

  it('忽略非本次请求 id 的消息', async () => {
    const child = fakeChild(true);
    const listeners: Array<(m: unknown) => void> = [];
    const host = new SandboxHost(
      () => ({
        postMessage: (message) => {
          const id = (message as { id: string }).id;
          queueMicrotask(() => {
            for (const l of listeners) l({ id: 'other', result: { ok: false } });
            for (const l of listeners) l({ id, result: { ok: true, output: 'mine' } });
          });
        },
        onMessage: (l) => listeners.push(l),
        kill: () => {},
      }),
      'child.js',
      50,
    );
    void child;
    const result = await host.run({ code: '' });
    expect(result).toEqual({ ok: true, output: 'mine' });
  });
});
