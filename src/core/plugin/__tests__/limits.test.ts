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
  checkContributionLimits,
  type DiscoveredPlugin,
  MAX_CONTRIBUTION_FILE_BYTES,
  PluginHost,
} from '../runtime.js';

const HOST = '2.0.0';

function plugin(id: string, files: Record<string, string> = {}): DiscoveredPlugin {
  return {
    manifest: {
      id,
      name: id.split('.').at(-1) ?? id,
      version: '1.0.0',
      host: '^2.0.0',
      license: 'MIT',
    } as DiscoveredPlugin['manifest'],
    files,
  };
}

describe('checkContributionLimits（§11.3 资源配额）', () => {
  it('正常资源通过', () => {
    expect(checkContributionLimits(plugin('com.a.p', { 'skills/a/SKILL.md': '# a' }))).toEqual([]);
  });

  it('单文件超限报错并含键', () => {
    const issues = checkContributionLimits(
      plugin('com.a.p', { 'skills/big.md': 'x'.repeat(MAX_CONTRIBUTION_FILE_BYTES + 1) }),
    );
    expect(issues.some((i) => i.includes('skills/big.md'))).toBe(true);
  });

  it('路径越界报错', () => {
    const issues = checkContributionLimits(plugin('com.a.p', { '../escape.md': 'x' }));
    expect(issues.some((i) => i.includes('越界'))).toBe(true);
  });

  it('单贡献键文件数超限报错', () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 33; i += 1) files[`skills/s${i}.md`] = 'x';
    expect(checkContributionLimits(plugin('com.a.p', files)).some((i) => i.includes('文件数'))).toBe(true);
  });
});

describe('PluginHost 装载配额（§10.6）', () => {
  it('超限插件只标记自身 failed，其余照常', () => {
    const host = new PluginHost({ hostVersion: HOST }, () => []);
    host.loadAll([
      plugin('com.a.bad', { 'skills/big.md': 'x'.repeat(MAX_CONTRIBUTION_FILE_BYTES + 1) }),
      plugin('com.a.good', { 'skills/ok.md': '# ok' }),
    ]);
    const bad = host.list().find((s) => s.id === 'com.a.bad');
    const good = host.list().find((s) => s.id === 'com.a.good');
    expect(bad?.state).toBe('failed');
    expect(bad?.error?.phase).toBe('load');
    expect(bad?.error?.message).toContain('skills/big.md');
    expect(good?.state).toBe('discovered');
  });
});
