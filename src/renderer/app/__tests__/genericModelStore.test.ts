/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listItemTypes: vi.fn(),
  listFields: vi.fn(),
  listViews: vi.fn(),
  listSequence: vi.fn(),
  saveItemType: vi.fn(),
}));

vi.mock('@/shared/services/repository', () => ({ repository: mocks }));

import { useGenericModelStore } from '../stores/genericModelStore';

describe('genericModelStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useGenericModelStore.getState().load(null);
  });

  it('加载作品模型：类型/字段/视图/顺序', async () => {
    mocks.listItemTypes.mockResolvedValue([
      { id: 'builtin:novel.chapter', workId: null, label: '章节', builtin: true },
      { id: 'user:spell', workId: 'w1', label: '法术', builtin: false },
    ]);
    mocks.listFields.mockResolvedValue([{ id: 'f1', itemTypeId: 'user:spell', key: 'level', label: '阶位', dataType: 'number', required: false, orderIndex: 0 }]);
    mocks.listViews.mockResolvedValue([{ id: 'v1', workId: 'w1', name: '时间线', viewType: 'timeline', config: {}, orderIndex: 0 }]);
    mocks.listSequence.mockResolvedValue([{ id: 's1', workId: 'w1', nodeId: 'c1', parentId: null, orderIndex: 0 }]);

    await useGenericModelStore.getState().load('w1');
    const state = useGenericModelStore.getState();
    expect(state.workId).toBe('w1');
    expect(state.loaded).toBe(true);
    expect(state.itemTypes).toHaveLength(2);
    expect(state.fieldsByType['user:spell']?.[0]?.key).toBe('level');
    expect(state.views[0]?.viewType).toBe('timeline');
    expect(state.sequence[0]?.nodeId).toBe('c1');
    expect(mocks.listItemTypes).toHaveBeenCalledWith('w1');
  });

  it('无作品时清空状态', async () => {
    mocks.listItemTypes.mockResolvedValue([{ id: 'x', workId: 'w1', label: 'x', builtin: false }]);
    await useGenericModelStore.getState().load('w1');
    await useGenericModelStore.getState().load(null);
    const state = useGenericModelStore.getState();
    expect(state.workId).toBeNull();
    expect(state.itemTypes).toHaveLength(0);
  });

  it('保存类型后重新加载', async () => {
    mocks.saveItemType.mockResolvedValue(undefined);
    mocks.listItemTypes.mockResolvedValue([]);
    mocks.listFields.mockResolvedValue([]);
    mocks.listViews.mockResolvedValue([]);
    mocks.listSequence.mockResolvedValue([]);

    await useGenericModelStore.getState().load('w1');
    await useGenericModelStore.getState().saveItemType({ id: 'user:t', workId: 'w1', label: '新类型', builtin: false });
    expect(mocks.saveItemType).toHaveBeenCalledTimes(1);
    expect(mocks.listItemTypes).toHaveBeenCalledTimes(2);
  });
});
