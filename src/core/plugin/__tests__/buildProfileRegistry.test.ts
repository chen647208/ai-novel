/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import type { BuildProfile } from '../../build/profile';
import { buildProfileKey,BuildProfileRegistry } from '../contributions';

function profile(id: string | undefined, name: string): BuildProfile {
  return {
    id,
    name,
    format: 'md',
    selection: { includeTypes: [], includeInactive: false, exclude: [], rootSwitches: { cards: false, meta: false } },
    transform: { headings: { chapter: '', scene: '', hide: [], renumber: false }, content: { includeSynopsis: false, includeComments: false, stripTags: [], resolveRefs: 'raw' } },
    render: { chapterPageBreak: false, stripUnicode: false },
  };
}

describe('BuildProfileRegistry', () => {
  it('按 id 注册与注销', () => {
    const registry = new BuildProfileRegistry();
    const d = registry.register(profile('p1', '甲'));
    expect(registry.get('p1')?.name).toBe('甲');
    expect(registry.list()).toHaveLength(1);
    d.dispose();
    expect(registry.get('p1')).toBeUndefined();
  });

  it('缺省 id 时回落 name', () => {
    expect(buildProfileKey(profile(undefined, '无名档'))).toBe('无名档');
    const registry = new BuildProfileRegistry();
    registry.register(profile(undefined, '无名档'));
    expect(registry.get('无名档')?.name).toBe('无名档');
  });
});
