/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 通用创作模型状态：当前作品的实体类型、字段、视图与叙事顺序。
 * 数据源为 repository 的可选方法；后端不支持时退化为空列表（不报错）。
 */
import { create } from 'zustand';

import { repository } from '@/shared/services/repository';
import type { FieldDefinition, ItemTypeDefinition, SequenceItem, ViewDefinition } from '@/shared/services/repository/types';
import { logger } from '@/shared/utils/logger';

export type {
  FieldDataType,
  FieldDefinition,
  ItemTypeDefinition,
  SequenceItem,
  ViewDefinition,
} from '@/shared/services/repository/types';

interface GenericModelState {
  workId: string | null;
  itemTypes: ItemTypeDefinition[];
  fieldsByType: Record<string, FieldDefinition[]>;
  views: ViewDefinition[];
  sequence: SequenceItem[];
  loaded: boolean;
  load: (workId: string | null) => Promise<void>;
  reload: () => Promise<void>;
  saveItemType: (itemType: ItemTypeDefinition) => Promise<void>;
  deleteItemType: (id: string) => Promise<void>;
  saveField: (field: FieldDefinition) => Promise<void>;
  deleteField: (id: string) => Promise<void>;
  saveView: (view: ViewDefinition) => Promise<void>;
  deleteView: (id: string) => Promise<void>;
  saveSequence: (items: SequenceItem[]) => Promise<void>;
}

async function loadFields(itemTypes: ItemTypeDefinition[]): Promise<Record<string, FieldDefinition[]>> {
  if (!repository.listFields) return {};
  const entries = await Promise.all(
    itemTypes.map(async (itemType) => {
      const fields = (await repository.listFields?.(itemType.id)) ?? [];
      return [itemType.id, fields] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export const useGenericModelStore = create<GenericModelState>()((set, get) => ({
  workId: null,
  itemTypes: [],
  fieldsByType: {},
  views: [],
  sequence: [],
  loaded: false,

  load: async (workId) => {
    if (!workId) {
      set({ workId: null, itemTypes: [], fieldsByType: {}, views: [], sequence: [], loaded: false });
      return;
    }
    try {
      const itemTypes = (await repository.listItemTypes?.(workId)) ?? [];
      const [fieldsByType, views, sequence] = await Promise.all([
        loadFields(itemTypes),
        Promise.resolve(repository.listViews?.(workId) ?? []),
        Promise.resolve(repository.listSequence?.(workId) ?? []),
      ]);
      set({ workId, itemTypes, fieldsByType, views, sequence, loaded: true });
    } catch (error) {
      logger.error('加载通用创作模型失败:', error);
      set({ workId, loaded: true });
    }
  },

  reload: async () => {
    await get().load(get().workId);
  },

  saveItemType: async (itemType) => {
    await repository.saveItemType?.(itemType);
    await get().reload();
  },

  deleteItemType: async (id) => {
    await repository.deleteItemType?.(id);
    await get().reload();
  },

  saveField: async (field) => {
    await repository.saveField?.(field);
    await get().reload();
  },

  deleteField: async (id) => {
    await repository.deleteField?.(id);
    await get().reload();
  },

  saveView: async (view) => {
    await repository.saveView?.(view);
    await get().reload();
  },

  deleteView: async (id) => {
    await repository.deleteView?.(id);
    await get().reload();
  },

  saveSequence: async (items) => {
    const workId = get().workId;
    if (!workId) return;
    await repository.saveSequence?.(workId, items);
    await get().reload();
  },
}));
