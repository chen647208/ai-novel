/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { Project } from '@shared/types';
import { describe, expect, it } from 'vitest';

import { collectWritingEntities, findMentionedEntities } from '../services/writingEntityService';

function makeProject(): Project {
  return {
    id: 'p1',
    title: 'T',
    inspiration: '',
    intro: '',
    outline: '',
    chapters: [],
    virtualChapters: [],
    lastModified: 0,
    characters: [{ id: 'c1', name: '林砚', gender: 'unknown', age: '', role: 'protagonist', personality: '', background: '', relationships: '', appearance: '', distinctiveFeatures: '', occupation: '测绘师', motivation: '', strengths: '', weaknesses: '', characterArc: '' }],
    locations: [{ id: 'l1', projectId: 'p1', name: '雾港', type: 'city', description: '海港城市', createdAt: 0, updatedAt: 0 }],
    factions: [{ id: 'f1', projectId: 'p1', name: '白鸦团', type: 'guild', description: '', createdAt: 0, updatedAt: 0 }],
    knowledge: [{ id: 'k1', name: '潮汐灵力', content: '灵力随月相涨落', type: 'text', size: 0, addedAt: 0, category: 'writing' }],
    timeline: { id: 'tl1', projectId: 'p1', config: { calendarSystem: 'default' }, events: [{ id: 'e1', date: { year: 1 }, title: '港城之战', description: '', type: 'battle' }], createdAt: 0, updatedAt: 0 },
  };
}

describe('writingEntityService', () => {
  it('汇总角色/地点/势力/知识/事件', () => {
    const entities = collectWritingEntities(makeProject());
    expect(entities.map((entity) => entity.kind)).toEqual(['character', 'location', 'faction', 'knowledge', 'event']);
    expect(entities.find((entity) => entity.id === 'c1')?.description).toBe('测绘师');
  });

  it('检测正文中出现的实体', () => {
    const entities = collectWritingEntities(makeProject());
    const mentioned = findMentionedEntities('林砚回到了雾港。', entities);
    expect([...mentioned].sort()).toEqual(['c1', 'l1']);
  });
});
