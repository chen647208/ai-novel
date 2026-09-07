/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import type { Project } from '../../../../shared/types';
import {
  normalizeGenderId,
  normalizeImpactId,
  normalizeProjectKinds,
  normalizeRoleId,
} from '../characterKinds';

describe('normalizeRoleId', () => {
  it('中英映射到枚举', () => {
    expect(normalizeRoleId('主角')).toBe('protagonist');
    expect(normalizeRoleId('protagonist')).toBe('protagonist');
    expect(normalizeRoleId('反派')).toBe('antagonist');
    expect(normalizeRoleId('villain')).toBe('antagonist');
    expect(normalizeRoleId('配角')).toBe('supporting');
    expect(normalizeRoleId('其他')).toBe('other');
  });

  it('未知与空值回退', () => {
    expect(normalizeRoleId('亦正亦邪')).toBe('supporting');
    expect(normalizeRoleId('')).toBe('supporting');
    expect(normalizeRoleId(undefined)).toBe('supporting');
    expect(normalizeRoleId('主角', 'protagonist')).toBe('protagonist');
  });

  it('枚举输入幂等', () => {
    expect(normalizeRoleId('supporting')).toBe('supporting');
    expect(normalizeRoleId('other')).toBe('other');
  });
});

describe('normalizeGenderId', () => {
  it('中英映射到枚举', () => {
    expect(normalizeGenderId('男')).toBe('male');
    expect(normalizeGenderId('female')).toBe('female');
    expect(normalizeGenderId('未知')).toBe('unknown');
    expect(normalizeGenderId('其他')).toBe('other');
  });

  it('未知与空值回退 unknown', () => {
    expect(normalizeGenderId('外星')).toBe('unknown');
    expect(normalizeGenderId('')).toBe('unknown');
    expect(normalizeGenderId(undefined)).toBe('unknown');
  });
});

describe('normalizeImpactId', () => {
  it('重大关键词判 major', () => {
    expect(normalizeImpactId('对主线有重大影响')).toBe('major');
    expect(normalizeImpactId('关键转折')).toBe('major');
    expect(normalizeImpactId('major event')).toBe('major');
  });

  it('其余判 minor', () => {
    expect(normalizeImpactId('次要铺垫')).toBe('minor');
    expect(normalizeImpactId('')).toBe('minor');
    expect(normalizeImpactId(undefined)).toBe('minor');
  });
});

describe('normalizeProjectKinds', () => {
  const project = (over: Partial<Project> = {}): Project =>
    ({
      id: 'b1',
      title: '书',
      inspiration: '',
      intro: '',
      characters: [],
      outline: '',
      chapters: [],
      virtualChapters: [],
      knowledge: [],
      lastModified: 1,
      ...over,
    }) as unknown as Project;

  it('中文人物值归一化为枚举', () => {
    const out = normalizeProjectKinds(
      project({
        characters: [
          {
            id: 'c1', name: '林渊', gender: '男', age: '25', role: '主角',
            personality: '', background: '', relationships: '', appearance: '',
            distinctiveFeatures: '', occupation: '', motivation: '', strengths: '',
            weaknesses: '', characterArc: '',
          } as unknown as import('../../../../shared/types').Character,
        ],
      }),
    );
    expect(out.characters[0]!.role).toBe('protagonist');
    expect(out.characters[0]!.gender).toBe('male');
  });

  it('无时间线重要度时按影响文本归一化一次', () => {
    const out = normalizeProjectKinds(
      project({
        timeline: {
          id: 'tl', projectId: 'b1', config: { calendarSystem: 'default' },
          events: [
            { id: 'e1', date: { year: 1 }, title: '决战', description: '', impact: '重大转折' },
            { id: 'e2', date: { year: 2 }, title: '闲笔', description: '' },
          ],
          createdAt: 1, updatedAt: 1,
        } as unknown as import('../../../../shared/types').Timeline,
      }),
    );
    expect(out.timeline!.events[0]!.significance).toBe('major');
    expect(out.timeline!.events[1]!.significance).toBe('minor');
  });

  it('已归一化时原对象返回（不制造新引用）', () => {
    const p = project({
      characters: [
        {
          id: 'c1', name: '林渊', gender: 'male', age: '25', role: 'protagonist',
          personality: '', background: '', relationships: '', appearance: '',
          distinctiveFeatures: '', occupation: '', motivation: '', strengths: '',
          weaknesses: '', characterArc: '',
        },
      ],
    });
    expect(normalizeProjectKinds(p)).toBe(p);
  });
});
