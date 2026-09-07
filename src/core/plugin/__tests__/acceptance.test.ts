/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { installTypeTemplates } from '../contributions.js';
import { typeTemplateId, toPluginError } from '../manifest.js';
import { TypeRegistry } from '../../types-registry/registry.js';
import { PluginHost } from '../runtime.js';

/**
 * 04 §10 验收对账：1/2/3 已由 plugin.test.ts 覆盖（manifest 路径定位、
 * 故障隔离、unwind 含逆序），本文件只补当时缺失的两条真实路径。
 * 新增验收项先查本文件的映射表，禁重复建用例。
 */
describe('04 §10 验收 4：命名空间冲突走真实注册表', () => {
  it('两插件同名声明 id 落各自前缀，互不覆盖且不污染内置', () => {
    const registry = new TypeRegistry([
      {
        id: 'novel.chapter',
        label: '章节',
        icon: 'file-text',
        category: 'novel',
        fields: [],
        views: ['outline'],
      },
    ]);
    const a = [{ id: 'scene', label: 'A 场景' }];
    const b = [{ id: 'scene', label: 'B 场景' }];
    const da = installTypeTemplates('com.a.p1', a, registry, typeTemplateId);
    const db = installTypeTemplates('com.b.p2', b, registry, typeTemplateId);

    expect(registry.get('p1.scene')?.label).toBe('A 场景');
    expect(registry.get('p2.scene')?.label).toBe('B 场景');
    expect(registry.get('novel.chapter')?.label).toBe('章节');
    expect(registry.get('scene')).toBeUndefined();

    for (const d of [...da, ...db]) d.dispose();
    expect(registry.get('p1.scene')).toBeUndefined();
    expect(registry.get('p2.scene')).toBeUndefined();
    expect(registry.get('novel.chapter')).toBeDefined();
  });
});

describe('04 §10 验收 5：cause 链完整', () => {
  it('toPluginError 按序保留嵌套 cause', () => {
    const err = new Error('装配失败', {
      cause: new Error('模板非法', { cause: new Error('字段缺失') }),
    });
    const pe = toPluginError('com.x.p', 'activate', err);
    expect(pe.pluginId).toBe('com.x.p');
    expect(pe.phase).toBe('activate');
    expect(pe.message).toBe('装配失败');
    expect(pe.cause).toEqual(['装配失败', '模板非法', '字段缺失']);
  });

  it('markFailed 状态面板错误携带完整 cause', () => {
    const host = new PluginHost({ hostVersion: '2.0.0' }, () => []);
    host.markFailed(
      'com.x.p',
      'discover',
      new Error('读盘失败', { cause: 'ENOENT: plugin.json' })
    );
    const status = host.list().find((s) => s.id === 'com.x.p')!;
    expect(status.state).toBe('failed');
    expect(status.error?.cause).toEqual(['读盘失败', 'ENOENT: plugin.json']);
  });
});
