/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { Chapter, Character, Project } from '@shared/types';
import { describe, expect, it } from 'vitest';

import { checkTimelineConsistency } from '../timelineConsistency';
import { buildTimelineModel, dateToOrdinal, snapTo } from '../timelineModel';

function makeCharacter(overrides: Partial<Character> & Pick<Character, 'id' | 'name'>): Character {
  return {
    gender: 'unknown',
    age: '',
    role: 'supporting',
    personality: '',
    background: '',
    relationships: '',
    appearance: '',
    distinctiveFeatures: '',
    occupation: '',
    motivation: '',
    strengths: '',
    weaknesses: '',
    characterArc: '',
    ...overrides,
  };
}

function makeChapter(overrides: Partial<Chapter> & Pick<Chapter, 'id' | 'title' | 'order'>): Chapter {
  return { summary: '', content: '', ...overrides };
}

function makeProject(): Project {
  return {
    id: 'p1',
    title: 'T',
    inspiration: '',
    intro: '',
    outline: '',
    chapters: [
      makeChapter({ id: 'ch1', title: '开端', order: 0, timelineEventId: 'e1', status: 'done' }),
      makeChapter({ id: 'ch2', title: '发展', order: 1 }),
      makeChapter({ id: 'ch3', title: '高潮', order: 2, timelineEventId: 'missing' }),
    ],
    virtualChapters: [],
    knowledge: [],
    lastModified: 0,
    characters: [
      makeCharacter({ id: 'c1', name: '主角', birthDate: { year: 110 } }),
    ],
    locations: [
      { id: 'l1', projectId: 'p1', name: '甲城', type: 'city', description: '', createdAt: 0, updatedAt: 0 },
      { id: 'l2', projectId: 'p1', name: '乙城', type: 'city', description: '', createdAt: 0, updatedAt: 0 },
    ],
    timeline: {
      id: 'tl1',
      projectId: 'p1',
      config: { calendarSystem: 'default' },
      events: [
        { id: 'e1', date: { year: 100, month: 1 }, title: '加冕', description: '', type: 'plot', significance: 'major', relatedCharacterIds: ['c1'], relatedLocationIds: ['l1'] },
        { id: 'e2', date: { year: 100, month: 1 }, title: '遇袭', description: '', type: 'battle', significance: 'minor', relatedCharacterIds: ['c1'], relatedLocationIds: ['l2'] },
        { id: 'e3', date: { year: 105, month: 6 }, title: '远征', description: '', type: 'battle', significance: 'major' },
      ],
      createdAt: 0,
      updatedAt: 0,
    },
    foreshadows: [
      { id: 'f1', title: '旧剑', detail: '', status: 'planted', importance: 'major', tags: [], plantedChapterOrder: 5, payoffChapterOrder: 2, createdAt: 0, updatedAt: 0 },
    ],
  };
}

describe('timelineModel', () => {
  it('dateToOrdinal 按月递增', () => {
    const jan = dateToOrdinal({ year: 100, month: 1 }) ?? -1;
    const feb = dateToOrdinal({ year: 100, month: 2 }) ?? -1;
    expect(jan).toBeLessThan(feb);
    expect(dateToOrdinal(undefined)).toBeNull();
  });

  it('snapTo 在阈值内贴到最近候选', () => {
    expect(snapTo(2.3, [1, 2, 3], 0.4)).toBe(2);
    expect(snapTo(2.3, [1, 2, 3], 0.1)).toBe(2.3);
  });

  it('叙事轴按章节 order，故事轴按日期且同刻分层', () => {
    const model = buildTimelineModel(makeProject());
    const narrativeClips = model.axes.find((axis) => axis.id === 'narrative')?.clips ?? [];
    const storyClips = model.axes.find((axis) => axis.id === 'story')?.clips ?? [];
    expect(narrativeClips.map((clip) => clip.label)).toEqual(['开端', '发展', '高潮']);
    expect(narrativeClips[0]?.importance).toBe('major');
    expect(storyClips.map((clip) => clip.label)).toEqual(['加冕', '遇袭', '远征']);
    expect(storyClips[0]?.start).toBe(0);
    expect(storyClips[0]?.lane).toBe(0);
    expect(storyClips[1]?.lane).toBe(1);
    expect(model.links).toEqual([{ fromClipId: 'chapter:ch1', toClipId: 'event:e1', label: 'depicts' }]);
  });
});

describe('timelineConsistency', () => {
  it('检出出生早于登场、伏笔倒置、缺失事件与同刻异地', () => {
    const codes = checkTimelineConsistency(makeProject()).map((issue) => issue.code);
    expect(codes).toContain('bornAfterAppearance');
    expect(codes).toContain('foreshadowOrder');
    expect(codes).toContain('missingEventLink');
    expect(codes).toContain('characterLocationConflict');
  });
});
