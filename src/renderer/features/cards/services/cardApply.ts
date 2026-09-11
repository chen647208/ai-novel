/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 卡片命令 → 项目字段增量（纯函数）。返回 null 表示未知命令，调用方负责提示。
 * 不直接写库：由调用方以 AI 归因提交，保证"审批通过才落库"。
 */
import { uuidv7 } from '@core/entities';
import {
  type Project,
  type AICardCommand,
  type CreatedCard,
  type Character,
  type Location,
  type Faction,
  type TimelineEvent,
  type Timeline,
  type RuleSystem,
  type MagicSystem,
  type TechnologyLevel,
  type WorldHistory,
  type WorldView,
} from '../../../../shared/types';

function ensureWorldView(project: Project): WorldView {
  return project.worldView ?? { id: uuidv7(), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() } as WorldView;
}

function ensureTimeline(project: Project): Timeline {
  return project.timeline ?? { id: uuidv7(), projectId: project.id, config: { calendarSystem: 'default' }, events: [], createdAt: Date.now(), updatedAt: Date.now() } as Timeline;
}

export function buildCardUpdates(project: Project, command: AICardCommand, data: CreatedCard): Partial<Project> | null {
  switch (command) {
    case 'character':
      return { characters: [...(project.characters || []), data as Character] };
    case 'location':
      return { locations: [...(project.locations || []), data as Location] };
    case 'faction':
      return { factions: [...(project.factions || []), data as Faction] };
    case 'timeline':
    case 'event':
      return {
        timeline: {
          ...ensureTimeline(project),
          events: [...(project.timeline?.events || []), data as TimelineEvent],
        } as Timeline,
      };
    case 'rule':
      return { ruleSystems: [...(project.ruleSystems || []), data as RuleSystem] };
    case 'magic':
      return {
        worldView: { ...ensureWorldView(project), magicSystem: data as MagicSystem } as WorldView,
      };
    case 'tech':
      return {
        worldView: { ...ensureWorldView(project), technologyLevel: data as TechnologyLevel } as WorldView,
      };
    case 'history':
      return {
        worldView: { ...ensureWorldView(project), history: data as WorldHistory } as WorldView,
      };
    default:
      return null;
  }
}
