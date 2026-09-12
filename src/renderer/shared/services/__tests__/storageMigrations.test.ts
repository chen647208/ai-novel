/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 历史数据迁移：知识库分类补全、虚拟章节拆分与去重。
 */
import { describe, expect,it } from 'vitest';

import type { AppState, Chapter } from '../../../../shared/types';
import { migrateKnowledgeCategories,migrateVirtualChapters } from '../storageMigrations';

const chapter = (id: string, over: Partial<Chapter> = {}): Chapter =>
  ({ id, title: id, content: '', order: 1, ...over } as unknown as Chapter);

const stateWith = (project: Record<string, unknown>): AppState =>
  ({ schemaVersion: 1, projects: [project], activeProjectId: null } as unknown as AppState);

describe('storageMigrations', () => {
  it('知识条目缺 category 补 writing，已有分类不动', () => {
    const state = stateWith({
      id: 'p', title: 'T', chapters: [],
      knowledge: [
        { id: 'k1', content: 'a' },
        { id: 'k2', content: 'b', category: 'character' },
      ],
    });
    const out = migrateKnowledgeCategories(state);
    expect(out.projects[0]!.knowledge![0]!.category).toBe('writing');
    expect(out.projects[0]!.knowledge![1]!.category).toBe('character');
  });

  it('虚拟章节从 chapters 迁到 virtualChapters，普通章节保留', () => {
    const state = stateWith({
      id: 'p', title: 'T', virtualChapters: [],
      chapters: [chapter('c1', { order: 1 }), chapter('v1', { order: -1 })],
    });
    const out = migrateVirtualChapters(state);
    expect(out.projects[0]!.chapters.map((c) => c.id)).toEqual(['c1']);
    expect(out.projects[0]!.virtualChapters!.map((c) => c.id)).toEqual(['v1']);
  });

  it('虚拟章节与既有 virtualChapters 合并去重', () => {
    const state = stateWith({
      id: 'p', title: 'T', virtualChapters: [chapter('v1', { order: -1 })],
      chapters: [chapter('v1', { order: -2 }), chapter('v2', { order: -3 })],
    });
    const out = migrateVirtualChapters(state);
    expect(out.projects[0]!.chapters).toHaveLength(0);
    expect(out.projects[0]!.virtualChapters!.map((c) => c.id).sort()).toEqual(['v1', 'v2']);
  });
});
