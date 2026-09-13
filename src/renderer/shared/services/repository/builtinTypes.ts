/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 内置实体类型与字段（通用创作模型的默认模板）。
 * id 稳定不变；每次启动按 id upsert，幂等。
 */
import type { FieldDefinition, ItemTypeDefinition, StorageRepository } from './types';

export const BUILTIN_ITEM_TYPES: ItemTypeDefinition[] = [
  { id: 'builtin:novel.chapter', workId: null, label: '章节', icon: 'FileText', color: '#6366f1', builtin: true },
  { id: 'builtin:novel.scene', workId: null, label: '场景', icon: 'Clapperboard', color: '#8b5cf6', builtin: true },
  { id: 'builtin:novel.character', workId: null, label: '角色', icon: 'User', color: '#0ea5e9', builtin: true },
  { id: 'builtin:novel.location', workId: null, label: '地点', icon: 'MapPin', color: '#10b981', builtin: true },
  { id: 'builtin:novel.faction', workId: null, label: '势力', icon: 'Flag', color: '#f59e0b', builtin: true },
  { id: 'builtin:novel.rule', workId: null, label: '规则体系', icon: 'Settings2', color: '#ef4444', builtin: true },
  { id: 'builtin:novel.event', workId: null, label: '事件', icon: 'Clock', color: '#14b8a6', builtin: true },
  { id: 'builtin:meta.knowledge', workId: null, label: '知识条目', icon: 'BookOpen', color: '#64748b', builtin: true },
];

export const BUILTIN_FIELDS: FieldDefinition[] = [
  { id: 'builtin:character.role', itemTypeId: 'builtin:novel.character', key: 'role', label: '定位', dataType: 'text', required: false, orderIndex: 0 },
  { id: 'builtin:character.age', itemTypeId: 'builtin:novel.character', key: 'age', label: '年龄', dataType: 'number', required: false, orderIndex: 1 },
  { id: 'builtin:character.summary', itemTypeId: 'builtin:novel.character', key: 'summary', label: '简介', dataType: 'text', required: false, orderIndex: 2 },
  { id: 'builtin:location.type', itemTypeId: 'builtin:novel.location', key: 'type', label: '类型', dataType: 'text', required: false, orderIndex: 0 },
  { id: 'builtin:faction.type', itemTypeId: 'builtin:novel.faction', key: 'type', label: '类型', dataType: 'text', required: false, orderIndex: 0 },
  { id: 'builtin:rule.category', itemTypeId: 'builtin:novel.rule', key: 'category', label: '分类', dataType: 'text', required: false, orderIndex: 0 },
  {
    id: 'builtin:event.storyTime',
    itemTypeId: 'builtin:novel.event',
    key: 'storyTime',
    label: '故事时间',
    dataType: 'date',
    required: false,
    orderIndex: 0,
  },
  {
    id: 'builtin:event.importance',
    itemTypeId: 'builtin:novel.event',
    key: 'importance',
    label: '重要度',
    dataType: 'option',
    options: ['major', 'minor'],
    required: false,
    defaultValue: 'minor',
    orderIndex: 1,
  },
  { id: 'builtin:event.duration', itemTypeId: 'builtin:novel.event', key: 'duration', label: '持续', dataType: 'number', required: false, orderIndex: 2 },
];

/** 幂等写入内置类型与字段；后端不支持时跳过。 */
export async function ensureBuiltinItemTypes(repo: StorageRepository): Promise<void> {
  if (repo.saveItemType) {
    for (const itemType of BUILTIN_ITEM_TYPES) await repo.saveItemType(itemType);
  }
  if (repo.saveField) {
    for (const field of BUILTIN_FIELDS) await repo.saveField(field);
  }
}
