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
};

vi.mock('@/shared/services/repository', () => ({}));

import { bootstrapPlugins } from '../pluginService';

describe('pluginService（磁盘发现 + 技能贡献装配）', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      electronAPI: {
        getAppDataPath: async () => '/data',
        listDirectory: async (dir: string) => {
          if (dir === '/data/plugins') {
            return [{ name: 'com.example.golden3', type: 'directory' }];
          }
          if (dir === '/data/plugins/com.example.golden3/skills') {
            return [{ name: 'extra.md', type: 'file' }];
          }
          return [];
        },
        readFile: async (path: string) => {
          const raw = files[path];
          if (raw === undefined) throw new Error(`not found: ${path}`);
          return raw;
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('发现→装载→自动激活：技能贡献进入目录；禁用后卸载', async () => {
    const catalog = new SkillCatalog();
    const host = await bootstrapPlugins({ skillCatalog: catalog, buildProfiles: new BuildProfileRegistry(), events: new EventBus() }, '2.0.0', []);

    const status = host.list().find((s) => s.id === 'com.example.golden3');
    // bootstrap 即激活（否则贡献点永不生效）
    expect(status?.state).toBe('active');
    expect(catalog.get('golden3-extra')?.body).toContain('扩展方法论');

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
});
