/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { SkillCatalog } from '@core/ai';
import { BuildProfileRegistry, EventBus } from '@core/plugin';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

const files: Record<string, string> = {
  '/data/plugins/com.example.golden3/plugin.json': JSON.stringify({
    id: 'com.example.golden3',
    name: 'golden3',
    version: '1.0.0',
    host: '^2.0.0',
    license: 'MIT',
    contributes: { skills: ['./skills/'] },
  }),
  '/data/plugins/com.example.golden3/skills/extra.md': `---
name: golden3-extra
description: 社区黄金三章扩展写法。触发词：社区开篇
---
# 扩展方法论
正文内容。
`,
  '/data/plugins/com.example.golden3/skills/handler.js': 'function run(input) { return { output: input }; }',
};

vi.mock('@/shared/services/repository', () => ({}));

import { bootstrapPlugins, setTrustedPluginKeys } from '../pluginService';

describe('pluginService（磁盘发现 + 技能贡献装配）', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      electronAPI: {
        getAppDataPath: async () => '/data',
        listDirectory: async (dir: string) => {
          if (dir === '/data/plugins') {
            return [{ name: 'com.example.golden3', type: 'directory' }];
          }
          return [];
        },
        pluginListDirectory: async (rootDir: string, rel: string) => {
          if (`${rootDir}/${rel}` === '/data/plugins/com.example.golden3/skills') {
            return [
              { name: 'extra.md', type: 'file' },
              { name: 'handler.js', type: 'file' },
            ];
          }
          return [];
        },
        pluginReadFile: async (rootDir: string, rel: string) => {
          const raw = files[`${rootDir}/${rel}`];
          if (raw === undefined) throw new Error(`not found: ${rootDir}/${rel}`);
          return raw;
        },
        pluginReadBinary: async (rootDir: string, rel: string) => {
          const raw = files[`${rootDir}/${rel}`];
          if (raw === undefined) throw new Error(`not found: ${rootDir}/${rel}`);
          return raw;
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setTrustedPluginKeys([]);
  });

  it('发现→装载→自动激活：技能贡献进入目录；禁用后卸载', async () => {
    const catalog = new SkillCatalog();
    const host = await bootstrapPlugins({ skillCatalog: catalog, buildProfiles: new BuildProfileRegistry(), events: new EventBus() }, '2.0.0', []);

    const status = host.list().find((s) => s.id === 'com.example.golden3');
    // bootstrap 即激活（否则贡献点永不生效）
    expect(status?.state).toBe('active');
    expect(catalog.get('golden3-extra')?.body).toContain('扩展方法论');
    expect(catalog.get('golden3-extra')?.handler?.code).toContain('function run');

    host.disable('com.example.golden3');
    expect(catalog.get('golden3-extra')).toBeUndefined();
    expect(status!.state).toBe('disabled');
  });

  it('配置级禁用：装载即 disabled，技能不注册', async () => {
    const catalog = new SkillCatalog();
    const host = await bootstrapPlugins({ skillCatalog: catalog, buildProfiles: new BuildProfileRegistry(), events: new EventBus() }, '2.0.0', ['com.example.golden3']);
    host.activate('com.example.golden3');
    expect(host.list()[0]!.state).toBe('disabled');
    expect(catalog.get('golden3-extra')).toBeUndefined();
  });

  it('无文件系统（预览环境）：静默跳过磁盘发现', async () => {
    vi.stubGlobal('window', { electronAPI: undefined });
    const catalog = new SkillCatalog();
    const host = await bootstrapPlugins({ skillCatalog: catalog, buildProfiles: new BuildProfileRegistry(), events: new EventBus() }, '2.0.0', []);
    expect(host.list()).toEqual([]);
  });

  it('贡献路径越界：插件 failed，不读取越界文件（§11.2 路径门）', async () => {
    vi.stubGlobal('window', {
      electronAPI: {
        getAppDataPath: async () => '/data',
        listDirectory: async (dir: string) =>
          dir === '/data/plugins' ? [{ name: 'com.bad.escape', type: 'directory' }] : [],
        pluginListDirectory: async () => [],
        pluginReadBinary: async () => '',
        pluginReadFile: async (rootDir: string, rel: string) => {
          const path = `${rootDir}/${rel}`;
          if (path === '/data/plugins/com.bad.escape/plugin.json') {
            return JSON.stringify({
              id: 'com.bad.escape',
              name: 'bad',
              version: '1.0.0',
              host: '^2.0.0',
              license: 'MIT',
              contributes: { skills: ['../secrets/'] },
            });
          }
          throw new Error(`不应读取越界文件：${path}`);
        },
      },
    });
    const catalog = new SkillCatalog();
    const host = await bootstrapPlugins({ skillCatalog: catalog, buildProfiles: new BuildProfileRegistry(), events: new EventBus() }, '2.0.0', []);
    const status = host.list().find((s) => s.id === 'com.bad.escape');
    expect(status?.state).toBe('failed');
    expect(status?.error?.cause.some((c) => String(c).includes('越界'))).toBe(true);
    expect(catalog.list()).toEqual([]);
  });

  it('签名包无信任键：fail closed（S4）', async () => {
    vi.stubGlobal('window', {
      electronAPI: {
        getAppDataPath: async () => '/data',
        listDirectory: async (dir: string) =>
          dir === '/data/plugins' ? [{ name: 'com.signed.p', type: 'directory' }] : [],
        pluginListDirectory: async () => [],
        pluginReadBinary: async () => '',
        pluginReadFile: async (_root: string, rel: string) => {
          if (rel === 'plugin.json') {
            return JSON.stringify({ id: 'com.signed.p', name: 'p', version: '1.0.0', host: '^2.0.0', license: 'MIT' });
          }
          if (rel === 'plugin.sig') {
            return JSON.stringify({ algorithm: 'ed25519', signature: 's', publicKey: 'k' });
          }
          throw new Error('missing');
        },
        pluginVerifySignature: async () => true,
      },
    });
    const catalog = new SkillCatalog();
    const host = await bootstrapPlugins(
      { skillCatalog: catalog, buildProfiles: new BuildProfileRegistry(), events: new EventBus() },
      '2.0.0',
      [],
    );
    const status = host.list().find((s) => s.id === 'com.signed.p');
    expect(status?.state).toBe('failed');
    expect(status?.error?.message).toContain('信任清单');
  });

  it('信任键命中且校验通过：签名包放行（S4）', async () => {
    setTrustedPluginKeys(['k']);
    vi.stubGlobal('window', {
      electronAPI: {
        getAppDataPath: async () => '/data',
        listDirectory: async (dir: string) =>
          dir === '/data/plugins' ? [{ name: 'com.signed.ok', type: 'directory' }] : [],
        pluginListDirectory: async () => [],
        pluginReadBinary: async () => '',
        pluginReadFile: async (_root: string, rel: string) => {
          if (rel === 'plugin.json') {
            return JSON.stringify({ id: 'com.signed.ok', name: 'p', version: '1.0.0', host: '^2.0.0', license: 'MIT' });
          }
          if (rel === 'plugin.sig') {
            return JSON.stringify({ algorithm: 'ed25519', signature: 's', publicKey: 'k' });
          }
          throw new Error('missing');
        },
        pluginVerifySignature: async () => true,
      },
    });
    const catalog = new SkillCatalog();
    const host = await bootstrapPlugins(
      { skillCatalog: catalog, buildProfiles: new BuildProfileRegistry(), events: new EventBus() },
      '2.0.0',
      [],
    );
    expect(host.list().find((s) => s.id === 'com.signed.ok')?.state).toBe('active');
  });
});
