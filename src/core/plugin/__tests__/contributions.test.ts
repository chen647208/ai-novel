/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import { installHooks } from '../contributions.js';
import type { InterceptHandler } from '../events.js';
import { type Disposable, PermissionDenied, type PluginManifest } from '../manifest.js';

function manifest(write?: string[]): PluginManifest {
  return {
    id: 'com.test.p',
    name: 'p',
    version: '1.0.0',
    host: '^1.0.0',
    license: 'MIT',
    permissions: write ? { write } : undefined,
  } as PluginManifest;
}

function makeBus() {
  const calls: unknown[] = [];
  return {
    calls,
    decorate: (_seam: string, policy: unknown): Disposable => {
      calls.push(policy);
      return { dispose: () => undefined };
    },
  };
}

describe('installHooks 权限强制', () => {
  it('未声明 write 域时拒绝（默认拒绝）', () => {
    expect(() => installHooks([{ on: 'ai.request', do: 'inject', text: 'x' }], makeBus() as never, 'com.test.p', manifest())).toThrow(PermissionDenied);
  });

  it('声明 write:ai 后正常安装', () => {
    const bus = makeBus();
    const ds = installHooks([{ on: 'ai.request', do: 'inject', text: 'x' }], bus as never, 'com.test.p', manifest(['ai']));
    expect(ds).toHaveLength(1);
    expect(bus.calls).toHaveLength(1);
  });

  it('gate 钩子注册拦截器并按 allow 放行/拒绝', () => {
    const handlers: InterceptHandler[] = [];
    const bus = {
      decorate: (): Disposable => ({ dispose: () => undefined }),
      intercept: (_type: string, handler: InterceptHandler): Disposable => {
        handlers.push(handler);
        return { dispose: () => undefined };
      },
    };
    const ds = installHooks(
      [{ on: 'ai.request', do: 'gate', allow: false, reason: '发行档禁用' }],
      bus as never,
      'com.test.p',
      manifest(['ai']),
    );
    expect(ds).toHaveLength(1);
    expect(handlers[0]?.({})).toEqual({ allowed: false, reason: '发行档禁用' });
  });
});
