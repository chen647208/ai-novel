/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { buildCardUpdates } from '../cardApply';
import type { Project, Character } from '@shared/types';

const project = { id: 'p1', title: '书', characters: [], locations: [], factions: [], ruleSystems: [] } as unknown as Project;

describe('buildCardUpdates', () => {
  it('角色命令追加到 characters', () => {
    const c = { id: 'c1', name: '甲' } as Character;
    const updates = buildCardUpdates(project, 'character', c);
    expect(updates?.characters).toEqual([c]);
  });

  it('未知命令返回 null', () => {
    expect(buildCardUpdates(project, 'nope' as never, {} as never)).toBeNull();
  });

  it('魔法命令写入 worldView.magicSystem', () => {
    const magic = { id: 'm1' };
    const updates = buildCardUpdates(project, 'magic', magic as never);
    expect((updates?.worldView as { magicSystem?: unknown }).magicSystem).toBe(magic);
  });
});
