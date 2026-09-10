/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { BuildProfileRegistry, type BuildProfile } from '../contributions';

function profile(id: string, name: string): BuildProfile {
  return { id, name, steps: [{ renderer: 'md' }] };
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

  it('空注册表返回空列表', () => {
    expect(new BuildProfileRegistry().list()).toEqual([]);
  });
});
