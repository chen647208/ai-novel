/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import type { Project } from '../../../shared/types';
import { blankContents, buildExampleProject, cloneProject } from '../bookFactory';

const fullProject = (): Project => ({
  id: 'src',
  title: '原书',
  inspiration: '灵感',
  intro: '简介',
  characters: [],
  outline: '大纲',
  chapters: [{ id: 'c1', title: '第一章', summary: '', content: '正文', order: 1 }],
  virtualChapters: [],
  knowledge: [],
  lastModified: 1,
  worldView: {
    id: 'w1', projectId: 'src',
    magicSystem: { name: '灵力', description: 'd', rules: ['r'], limitations: 'l' },
    createdAt: 1, updatedAt: 1,
  },
  locations: [{ id: 'l1', name: '雾港', description: 'd' } as never],
  factions: [{ id: 'f1', name: '守望会' } as never],
  timeline: { events: [{ id: 'e1' } as never] } as never,
  ruleSystems: [{ id: 'r1' } as never],
  foreshadows: [{ id: 'fo1' } as never],
  wordTarget: 100,
  tags: ['奇幻'],
});

describe('cloneProject', () => {
  it('完整深拷贝全部字段（含世界观/地点/势力/时间线/规则/伏笔）', () => {
    const source = fullProject();
    const clone = cloneProject(source, '副本');
    expect(clone.title).toBe('副本');
    expect(clone.id).not.toBe(source.id);
    expect(clone.worldView).toEqual(source.worldView);
    expect(clone.locations).toEqual(source.locations);
    expect(clone.factions).toEqual(source.factions);
    expect(clone.timeline).toEqual(source.timeline);
    expect(clone.ruleSystems).toEqual(source.ruleSystems);
    expect(clone.foreshadows).toEqual(source.foreshadows);
    expect(clone.chapters).toEqual(source.chapters);
    expect(clone.tags).toEqual(['奇幻']);
  });

  it('不共享嵌套引用（改副本不影响原书）', () => {
    const source = fullProject();
    const clone = cloneProject(source, '副本');
    clone.chapters[0]!.content = '改动';
    clone.worldView!.magicSystem!.rules.push('新规则');
    expect(source.chapters[0]!.content).toBe('正文');
    expect(source.worldView!.magicSystem!.rules).toEqual(['r']);
  });

  it('替换简介，未传则沿用原书简介', () => {
    const source = fullProject();
    expect(cloneProject(source, 'a', '新简介').intro).toBe('新简介');
    expect(cloneProject(source, 'b').intro).toBe('简介');
  });
});

describe('blankContents', () => {
  it('覆盖全部设定字段，清空无残留', () => {
    const blank = blankContents();
    expect(blank.characters).toEqual([]);
    expect(blank.chapters).toEqual([]);
    expect(blank.outline).toBe('');
    expect(blank.inspiration).toBe('');
    expect(blank.intro).toBe('');
    // 设定类字段全部显式 undefined（否则清空后旧设定残留）
    for (const key of ['worldView', 'locations', 'factions', 'timeline', 'ruleSystems', 'foreshadows'] as const) {
      expect(key in blank).toBe(true);
      expect(blank[key]).toBeUndefined();
    }
  });
});

describe('buildExampleProject', () => {
  it('产出真实预设结构：世界观/两个角色/两章', () => {
    const book = buildExampleProject('示例', '简介');
    expect(book.title).toBe('示例');
    expect(book.intro).toBe('简介');
    expect(book.worldView?.magicSystem?.name).toBeTruthy();
    expect(book.characters).toHaveLength(2);
    expect(book.characters[0]!.role).toBe('protagonist');
    expect(book.chapters).toHaveLength(2);
    expect(book.chapters[0]!.title).toBeTruthy();
    expect(book.chapters[0]!.status).toBe('draft');
    // 世界观 projectId 指向本书
    expect(book.worldView?.projectId).toBe(book.id);
  });
});
