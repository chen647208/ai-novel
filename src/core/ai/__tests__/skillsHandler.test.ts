/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it } from 'vitest';

import { hashContent, SkillCatalog } from '../skills';

const skill = (name: string) => ({
  name,
  description: 'd',
  triggers: [],
  tools: [],
  hosts: [],
  source: 'plugin' as const,
  body: 'B',
});

describe('hashContent + SkillCatalog.setHandler（§9.3.8 内容哈希热重载）', () => {
  it('哈希稳定且随内容变化', () => {
    expect(hashContent('abc')).toBe(hashContent('abc'));
    expect(hashContent('abc')).not.toBe(hashContent('abd'));
  });

  it('同一内容返回 unchanged，内容变化返回 set', () => {
    const catalog = new SkillCatalog();
    catalog.register(skill('s'));
    expect(catalog.setHandler('s', { code: 'function run(){}', sourceFile: 'a.js' })).toBe('set');
    expect(catalog.get('s')?.handler?.hash).toBe(hashContent('function run(){}'));
    expect(catalog.setHandler('s', { code: 'function run(){}', sourceFile: 'a.js' })).toBe('unchanged');
    expect(catalog.setHandler('s', { code: 'function run(){return 1;}', sourceFile: 'a.js' })).toBe('set');
  });

  it('未注册技能返回 missing', () => {
    const catalog = new SkillCatalog();
    expect(catalog.setHandler('nope', { code: '', sourceFile: 'x' })).toBe('missing');
  });

  it('激活技能带出逻辑轨 handler', () => {
    const catalog = new SkillCatalog();
    catalog.register(skill('s'));
    catalog.setHandler('s', { code: 'function run(){}', sourceFile: 'a.js' });
    catalog.activate('s');
    expect(catalog.getActive()?.handler?.sourceFile).toBe('a.js');
  });
});
