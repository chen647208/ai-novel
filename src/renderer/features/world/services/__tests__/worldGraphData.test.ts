/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { buildGraphData, type WorldGraphFilters } from '../worldGraphData';
import type { Character, Faction } from '@shared/types';
import type { TFunction } from 'i18next';

const t = ((k: string) => k) as unknown as TFunction<'world'>;
const filters: WorldGraphFilters = { showCharacters: true, showFactions: true, showLocations: true, showEvents: true, showRules: true };
const dims = { width: 800, height: 600 };

const char = (id: string, name: string, over: Partial<Character> = {}): Character =>
  ({ id, name, role: 'supporting', age: '20', relationships: '', ...over } as Character);

describe('buildGraphData', () => {
  it('character 类型只出角色节点，主角带专属颜色与更大尺寸', () => {
    const characters = [char('a', '甲', { role: 'protagonist' }), char('b', '乙')];
    const out = buildGraphData({ characters, locations: [], factions: [], ruleSystems: [], activeType: 'character', filters, dimensions: dims, nodePositions: {}, t });
    expect(out.nodes).toHaveLength(2);
    expect(out.nodes[0]).toMatchObject({ id: 'char-a', type: 'character', size: 40, color: 'var(--color-chart-2)' });
    expect(out.nodes[1]!.size).toBe(30);
  });

  it('关系互相包含时生成角色连线', () => {
    const characters = [char('a', '甲', { relationships: '乙' }), char('b', '乙')];
    const out = buildGraphData({ characters, locations: [], factions: [], ruleSystems: [], activeType: 'character', filters, dimensions: dims, nodePositions: {}, t });
    expect(out.links.some((l) => l.type === 'relationship')).toBe(true);
  });

  it('faction 成员生成 belongs 连线', () => {
    const factions = [{ id: 'f', name: '盟', type: 'guild', memberCharacterIds: ['a'] }] as unknown as Faction[];
    const out = buildGraphData({ characters: [], locations: [], factions, ruleSystems: [], activeType: 'faction', filters, dimensions: dims, nodePositions: {}, t });
    expect(out.nodes.map((n) => n.id)).toContain('faction-f');
    expect(out.links[0]).toMatchObject({ source: 'char-a', target: 'faction-f', type: 'belongs', dashed: true });
  });

  it('过滤开关关闭时不出该类型节点', () => {
    const out = buildGraphData({ characters: [char('a', '甲')], locations: [], factions: [], ruleSystems: [], activeType: 'character', filters: { ...filters, showCharacters: false }, dimensions: dims, nodePositions: {}, t });
    expect(out.nodes).toHaveLength(0);
  });

  it('已拖拽坐标优先于环形排布', () => {
    const out = buildGraphData({ characters: [char('a', '甲')], locations: [], factions: [], ruleSystems: [], activeType: 'character', filters, dimensions: dims, nodePositions: { 'char-a': { x: 11, y: 22 } }, t });
    expect(out.nodes[0]).toMatchObject({ x: 11, y: 22 });
  });
});
