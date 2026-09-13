/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 写作实体：把作品的世界要素汇总为可检索、可插入、可检测出现的条目。 */
import type { Project } from '@shared/types';

export type WritingEntityKind = 'character' | 'location' | 'faction' | 'knowledge' | 'event';

export interface WritingEntity {
  id: string;
  name: string;
  kind: WritingEntityKind;
  description: string;
}

export function collectWritingEntities(project: Project): WritingEntity[] {
  const entities: WritingEntity[] = [];
  for (const character of project.characters ?? []) {
    entities.push({ id: character.id, name: character.name, kind: 'character', description: character.personality || character.background || character.occupation });
  }
  for (const location of project.locations ?? []) {
    entities.push({ id: location.id, name: location.name, kind: 'location', description: location.description });
  }
  for (const faction of project.factions ?? []) {
    entities.push({ id: faction.id, name: faction.name, kind: 'faction', description: faction.description });
  }
  for (const item of project.knowledge ?? []) {
    entities.push({ id: item.id, name: item.name, kind: 'knowledge', description: item.content.slice(0, 120) });
  }
  for (const event of project.timeline?.events ?? []) {
    entities.push({ id: event.id, name: event.title, kind: 'event', description: event.description });
  }
  return entities;
}

/** 当前章节正文中出现过名字的实体 id 集合。 */
export function findMentionedEntities(content: string, entities: WritingEntity[]): Set<string> {
  const mentioned = new Set<string>();
  if (!content) return mentioned;
  for (const entity of entities) {
    if (entity.name.trim().length > 0 && content.includes(entity.name)) mentioned.add(entity.id);
  }
  return mentioned;
}
