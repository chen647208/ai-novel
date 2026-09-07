/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { satisfiesRange, validateManifest } from '../manifest.js';
import { PluginHost, type DiscoveredPlugin } from '../runtime.js';
import { BUILTIN_BUNDLE_MANIFESTS } from '../builtin/manifests.js';

const HOST = '2.0.0';

function plugin(id: string, over: Record<string, unknown> = {}): DiscoveredPlugin {
  return {
    manifest: {
      id,
      name: id.split('.').at(-1) ?? id,
      version: '1.0.0',
      host: '^2.0.0',
      license: 'MIT',
      ...over,
    } as DiscoveredPlugin['manifest'],
    files: {},
  };
}

describe('satisfiesRange', () => {
  it('^ 同主版本且 ≥；~ 同主.次且 ≥；* 全放行；精确相等', () => {
    expect(satisfiesRange('2.1.0', '^2.0.0')).toBe(true);
    expect(satisfiesRange('3.0.0', '^2.0.0')).toBe(false);
    expect(satisfiesRange('2.0.5', '~2.0.0')).toBe(true);
    expect(satisfiesRange('2.1.0', '~2.0.0')).toBe(false);
    expect(satisfiesRange('1.0.0', '*')).toBe(true);
    expect(satisfiesRange('1.0.0', '1.0.0')).toBe(true);
  });
});

describe('manifest.dependencies 校验', () => {
  it('合法依赖通过；自依赖/坏 id/非字符串区间报错', () => {
    const ok = validateManifest(plugin('com.a.p', { dependencies: { 'com.b.p': '^1.0.0' } }).manifest);
    expect(ok.ok).toBe(true);

    const bad = validateManifest(plugin('com.a.p', { dependencies: { 'com.a.p': '^1.0.0' } }).manifest);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.issues.some((i) => i.message.includes('不能依赖自身'))).toBe(true);
  });
});

describe('依赖激活顺序（PluginHost 拓扑）', () => {
  it('依赖先于依赖方激活', () => {
    const order: string[] = [];
    const host = new PluginHost({ hostVersion: HOST }, (p) => {
      order.push(p.manifest.id);
      return [];
    });
    host.loadAll([
      plugin('com.b.plugin', { dependencies: { 'com.a.plugin': '^1.0.0' } }),
      plugin('com.a.plugin'),
    ]);
    host.activateAll();
    // b 依赖 a：无论 loadAll 顺序，a 先装配
    expect(order.indexOf('com.a.plugin')).toBeLessThan(order.indexOf('com.b.plugin'));
    expect(host.list().every((s) => s.state === 'active')).toBe(true);
  });

  it('缺失依赖 → 依赖方 failed，其余照常', () => {
    const host = new PluginHost({ hostVersion: HOST }, () => []);
    host.loadAll([plugin('com.orphan.plugin', { dependencies: { 'com.missing.plugin': '^1.0.0' } }), plugin('com.ok.plugin')]);
    host.activateAll();
    const orphan = host.list().find((s) => s.id === 'com.orphan.plugin')!;
    expect(orphan.state).toBe('failed');
    expect(orphan.error?.message).toContain('缺少依赖插件');
    expect(host.list().find((s) => s.id === 'com.ok.plugin')?.state).toBe('active');
  });

  it('依赖版本不满足 → failed', () => {
    const host = new PluginHost({ hostVersion: HOST }, () => []);
    host.loadAll([
      plugin('com.lib.plugin', { version: '2.0.0' }),
      plugin('com.app.plugin', { dependencies: { 'com.lib.plugin': '^1.0.0' } }),
    ]);
    host.activateAll();
    expect(host.list().find((s) => s.id === 'com.app.plugin')?.state).toBe('failed');
  });

  it('循环依赖：activate 显式报错', () => {
    const host = new PluginHost({ hostVersion: HOST }, () => []);
    host.loadAll([
      plugin('com.x.plugin', { dependencies: { 'com.y.plugin': '^1.0.0' } }),
      plugin('com.y.plugin', { dependencies: { 'com.x.plugin': '^1.0.0' } }),
    ]);
    host.activate('com.x.plugin');
    const x = host.list().find((s) => s.id === 'com.x.plugin')!;
    expect(x.state).toBe('failed');
    expect(x.error?.message).toContain('循环依赖');
  });

  it('内置三 bundle manifest 经同一校验路径装载并按依赖序激活', () => {
    const order: string[] = [];
    const host = new PluginHost({ hostVersion: '2.0.0' }, (p) => {
      order.push(p.manifest.id);
      return [];
    });
    for (const manifest of BUILTIN_BUNDLE_MANIFESTS) {
      host.loadRaw(manifest.id, manifest, {});
    }
    host.activateAll();
    expect(order).toEqual([
      'com.novalocal.bundle.core',
      'com.novalocal.bundle.world',
      'com.novalocal.bundle.ai',
    ]);
  });
});
