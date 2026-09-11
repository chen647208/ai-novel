/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 世界观图谱数据构建（从 WorldViewGraph 抽出，纯函数）：
 * 按图类型 + 过滤开关产出节点/连线，位置沿用已拖拽坐标或按环形半径排布。
 */
import type { TFunction } from 'i18next';

import { normalizeRoleId } from '@/shared/utils/characterKinds';
import { roleLabel } from '@/shared/utils/displayLabels';

import {
  type Character,
  type DiagramType,
  type Faction,
  type GraphData,
  type GraphLink,
  type GraphNode,
  type Location,
  type RuleSystem,
  type Timeline,
} from '../../../../shared/types';

// 节点颜色映射：经主题 chart 令牌引用（深色自动切换，禁十六进制硬编码）
export const NODE_COLORS = {
  character: 'var(--color-chart-1)',
  character_main: 'var(--color-chart-2)',
  character_villain: 'var(--color-chart-3)',
  faction: 'var(--color-chart-4)',
  location: 'var(--color-chart-5)',
  event: 'var(--color-chart-6)',
  rule: 'var(--color-chart-7)',
  worldview: 'var(--color-chart-8)',
};

// 角色类型映射（枚举比较，与语言无关）
const getCharacterColor = (role: string): string => {
  switch (normalizeRoleId(role, 'other')) {
    case 'protagonist': return NODE_COLORS.character_main;
    case 'antagonist': return NODE_COLORS.character_villain;
    case 'supporting': return NODE_COLORS.character;
    default: return 'var(--color-chart-gray)';
  }
};

export interface WorldGraphFilters {
  showCharacters: boolean;
  showFactions: boolean;
  showLocations: boolean;
  showEvents: boolean;
  showRules: boolean;
}

export interface BuildGraphDataParams {
  characters: Character[];
  locations: Location[];
  factions: Faction[];
  timeline?: Timeline;
  ruleSystems: RuleSystem[];
  activeType: DiagramType;
  filters: WorldGraphFilters;
  dimensions: { width: number; height: number };
  nodePositions: Record<string, { x: number; y: number }>;
  t: TFunction<'world'>;
}

export function buildGraphData({
  characters,
  locations,
  factions,
  timeline,
  ruleSystems,
  activeType,
  filters,
  dimensions,
  nodePositions,
  t,
}: BuildGraphDataParams): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  // 根据类型过滤
  const includeCharacters = activeType === 'character' || activeType === 'mixed' || activeType === 'worldview';
  const includeFactions = activeType === 'faction' || activeType === 'mixed' || activeType === 'worldview';
  const includeLocations = activeType === 'location' || activeType === 'mixed' || activeType === 'worldview';
  const includeEvents = activeType === 'timeline' || activeType === 'mixed' || activeType === 'worldview';
  const includeRules = activeType === 'worldview';

  // 添加角色节点
  if (includeCharacters && filters.showCharacters) {
    characters.forEach((char, index) => {
      const angle = (index / Math.max(characters.length, 1)) * 2 * Math.PI;
      const radius = 200;
      nodes.push({
        id: `char-${char.id}`,
        type: 'character',
        name: char.name,
        description: `${roleLabel(char.role)} | ${char.age}`,
        x: nodePositions[`char-${char.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
        y: nodePositions[`char-${char.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
        color: getCharacterColor(char.role),
        size: normalizeRoleId(char.role, 'other') === 'protagonist' ? 40 : 30,
        icon: 'user',
        data: char,
      });
    });

    // 角色关系连线
    characters.forEach(char => {
      characters.forEach(other => {
        if (char.id === other.id) return;
        if (char.relationships?.includes(other.name) || other.relationships?.includes(char.name)) {
          links.push({
            id: `link-char-${char.id}-${other.id}`,
            source: `char-${char.id}`,
            target: `char-${other.id}`,
            type: 'relationship',
            label: t('graph.link.relationship'),
            strength: 0.7,
          });
        }
      });
    });
  }

  // 添加势力节点
  if (includeFactions && filters.showFactions) {
    factions.forEach((faction, index) => {
      const angle = ((index + 0.5) / Math.max(factions.length, 1)) * 2 * Math.PI;
      const radius = 320;
      nodes.push({
        id: `faction-${faction.id}`,
        type: 'faction',
        name: faction.name,
        description: faction.type,
        x: nodePositions[`faction-${faction.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
        y: nodePositions[`faction-${faction.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
        color: NODE_COLORS.faction,
        size: 45,
        icon: 'users',
        data: faction,
      });

      // 势力与角色关联
      faction.memberCharacterIds?.forEach(charId => {
        links.push({
          id: `link-faction-${faction.id}-char-${charId}`,
          source: `char-${charId}`,
          target: `faction-${faction.id}`,
          type: 'belongs',
          label: t('graph.link.belongs'),
          strength: 0.5,
          dashed: true,
        });
      });
    });
  }

  // 添加地点节点
  if (includeLocations && filters.showLocations) {
    locations.forEach((loc, index) => {
      const angle = ((index + 0.25) / Math.max(locations.length, 1)) * 2 * Math.PI;
      const radius = 400;
      nodes.push({
        id: `loc-${loc.id}`,
        type: 'location',
        name: loc.name,
        description: loc.type,
        x: nodePositions[`loc-${loc.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
        y: nodePositions[`loc-${loc.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
        color: NODE_COLORS.location,
        size: 35,
        icon: 'map-marker-alt',
        data: loc,
      });
    });
  }

  // 添加事件节点
  if (includeEvents && filters.showEvents && timeline?.events) {
    timeline.events.forEach((event, index) => {
      const angle = (index / Math.max(timeline.events.length, 1)) * 2 * Math.PI;
      const radius = 280;
      nodes.push({
        id: `event-${event.id}`,
        type: 'event',
        name: event.title,
        description: event.date.display || `${event.date.year}`,
        x: nodePositions[`event-${event.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
        y: nodePositions[`event-${event.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
        color: NODE_COLORS.event,
        size: 32,
        icon: 'clock',
        data: event,
      });

      // 事件与角色关联
      event.relatedCharacterIds?.forEach(charId => {
        links.push({
          id: `link-event-${event.id}-char-${charId}`,
          source: `event-${event.id}`,
          target: `char-${charId}`,
          type: 'event',
          label: t('graph.link.participates'),
          strength: 0.4,
          dashed: true,
        });
      });
    });
  }

  // 添加规则系统节点
  if (includeRules && filters.showRules) {
    ruleSystems.forEach((rule, index) => {
      const angle = ((index + 0.75) / Math.max(ruleSystems.length, 1)) * 2 * Math.PI;
      const radius = 360;
      nodes.push({
        id: `rule-${rule.id}`,
        type: 'rule',
        name: rule.name,
        description: rule.type,
        x: nodePositions[`rule-${rule.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
        y: nodePositions[`rule-${rule.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
        color: NODE_COLORS.rule,
        size: 38,
        icon: 'cogs',
        data: rule,
      });
    });
  }

  return { nodes, links };
}
