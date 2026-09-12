/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import {
  assertPermission,
  commandId,
  PermissionDenied,
  shortId,
  typeTemplateId,
  validateManifest,
} from '../manifest.js';
import { type DiscoveredPlugin,PluginHost } from '../runtime.js';

const HOST = '2.0.0';

function plugin(id: string, over: Record<string, unknown> = {}): DiscoveredPlugin {
  return {
    manifest: {
      id,
      name: id.split('.').at(-1) ?? id,
      version: '1.0.0',
      host: '^2.0.0',
      license: 'MIT',
      permissions: { read: ['manuscript'], write: ['cards'] },
      ...over,
    } as DiscoveredPlugin['manifest'],
    files: {},
  };
}

describe('validateManifest（验收 1：错误定位 JSON 路径）', () => {
  it('合法 manifest 通过', () => {
    const r = validateManifest(plugin('com.x.y').manifest);
    expect(r.ok).toBe(true);
  });

  it('多项问题一次报出且带路径', () => {
    const r = validateManifest({ id: 'bad', name: '', version: '1.x', license: 'MIT', host: '^2.0.0' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const paths = r.issues.map((i) => i.path);
      expect(paths).toContain('id');
      expect(paths).toContain('name');
      expect(paths).toContain('version');
    }
  });
});

describe('命名空间（验收 4：同名各自前缀化）', () => {
  it('两个插件注册同名类型，各自前缀互不覆盖', () => {
    const types = new Map<string, string>();
    types.set(typeTemplateId('com.a.p1', 'scene'), 'a');
    types.set(typeTemplateId('com.b.p2', 'scene'), 'b');
    expect(types.get('p1.scene')).toBe('a');
    expect(types.get('p2.scene')).toBe('b');
    expect(commandId('com.a.p1', 'run')).toBe('/p1:run');
    expect(shortId('com.a.p1')).toBe('p1');
  });
});

describe('PluginHost 生命周期', () => {
  it('故障隔离（验收 2）：一个插件失败其余可用，状态面板正确', () => {
    const registry: string[] = [];
    const host = new PluginHost({ hostVersion: HOST }, (p, sink) => {
      if (p.manifest.id === 'com.bad.plugin') throw new Error('装配爆炸');
      registry.push(p.manifest.id);
      sink.add({ dispose: () => void registry.splice(registry.indexOf(p.manifest.id), 1) });
    });
    host.loadRaw('com.bad.plugin', { id: 'com.bad.plugin', name: 'bad', version: '1.0.0', host: '^9.9.9', license: 'MIT' }, {});
    host.loadAll([plugin('com.good.plugin')]);
    host.activate('com.bad.plugin');
    host.activate('com.good.plugin');

    const statuses = host.list();
    expect(statuses.find((s) => s.id === 'com.bad.plugin')?.state).toBe('failed');
    expect(statuses.find((s) => s.id === 'com.bad.plugin')?.error?.message).toContain('宿主版本');
    expect(statuses.find((s) => s.id === 'com.good.plugin')?.state).toBe('active');
    expect(registry).toEqual(['com.good.plugin']);
  });

  it('unwind（验收 3）：禁用后注册全部消失，重新启用恢复', () => {
    const registry: string[] = [];
    const host = new PluginHost({ hostVersion: HOST }, (p, sink) => {
      registry.push(p.manifest.id);
      sink.add({
        dispose: () => {
          registry.splice(registry.indexOf(p.manifest.id), 1);
        },
      });
    });
    host.loadAll([plugin('com.a.plugin')]);
    host.activate('com.a.plugin');
    expect(registry).toEqual(['com.a.plugin']);

    host.disable('com.a.plugin');
    expect(registry).toEqual([]);
    expect(host.list()[0]!.state).toBe('disabled');

    host.enable('com.a.plugin');
    host.activate('com.a.plugin');
    expect(registry).toEqual(['com.a.plugin']);
  });

  it('配置级 disabled：装载即不激活', () => {
    const host = new PluginHost({ hostVersion: HOST, disabled: ['com.off.plugin'] }, () => []);
    host.loadAll([plugin('com.off.plugin')]);
    host.activate('com.off.plugin');
    expect(host.list()[0]!.state).toBe('disabled');
  });

  it('unwind 逆序：dispose 按注册的相反顺序执行', () => {
    const order: string[] = [];
    const host = new PluginHost({ hostVersion: HOST }, (_p, sink) => {
      sink.add({ dispose: () => void order.push('first') });
      sink.add({ dispose: () => void order.push('second') });
      sink.add({ dispose: () => {
        order.push('third');
        throw new Error('单个 dispose 失败不阻断其余');
      } });
    });
    host.loadAll([plugin('com.rev.plugin')]);
    host.activate('com.rev.plugin');
    host.disable('com.rev.plugin');
    expect(order).toEqual(['third', 'second', 'first']);
  });

  it('装配中途抛错：已注册项逆序回滚（验收 8）', () => {
    const order: string[] = [];
    const host = new PluginHost({ hostVersion: HOST }, (_p, sink) => {
      sink.add({ dispose: () => void order.push('first') });
      sink.add({ dispose: () => void order.push('second') });
      throw new Error('第三项注册失败');
    });
    host.loadAll([plugin('com.rollback.plugin')]);
    host.activate('com.rollback.plugin');
    expect(order).toEqual(['second', 'first']);
    expect(host.list()[0]!.state).toBe('failed');
    expect(host.list()[0]!.error?.message).toContain('第三项注册失败');
  });
});

describe('权限（验收 5：deny-by-default）', () => {
  it('未声明 write 的域抛 PermissionDenied，已声明域放行', () => {
    const manifest = plugin('com.x.plugin').manifest;
    expect(() => assertPermission(manifest, 'write', 'cards')).not.toThrow();
    expect(() => assertPermission(manifest, 'write', 'manuscript')).toThrow(PermissionDenied);
    expect(() => assertPermission(manifest, 'read', 'index')).toThrow(PermissionDenied);
  });

  it('宿主权限代理对未装载插件直接拒绝', () => {
    const host = new PluginHost({ hostVersion: HOST }, () => []);
    expect(() => host.assertCan('com.ghost.plugin', 'read', 'manuscript')).toThrow(PermissionDenied);
  });
});
