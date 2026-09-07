/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import type { Foreshadow, Project } from '../../../../../shared/types';
import {
  createForeshadow,
  addForeshadow,
  updateForeshadow,
  removeForeshadow,
  payOffForeshadow,
  setStatus,
  openForeshadows,
  overdueForeshadows,
  foreshadowCounts,
  buildForeshadowContextForPrompt,
} from '../foreshadowService';

const project = (foreshadows: Foreshadow[] = []): Project =>
  ({ id: 'p', title: '书', chapters: [], foreshadows } as unknown as Project);

const fs = (over: Partial<Foreshadow> = {}): Foreshadow =>
  createForeshadow({ title: '伏笔', detail: '内容', ...over });

describe('createForeshadow', () => {
  it('填充默认值与系统字段', () => {
    const f = createForeshadow({ title: '神秘玉佩', detail: '主角身世线索' }, 1000);
    expect(f.status).toBe('planted');
    expect(f.importance).toBe('major');
    expect(f.tags).toEqual([]);
    expect(f.createdAt).toBe(1000);
    expect(f.id).toMatch(/^fs_1000_/);
  });

  it('去除标题首尾空白', () => {
    expect(createForeshadow({ title: '  x  ', detail: 'y' }).title).toBe('x');
  });
});

describe('增删改', () => {
  it('add 不修改原 project', () => {
    const p = project();
    addForeshadow(p, fs());
    expect(p.foreshadows).toEqual([]);
  });

  it('update 仅改目标并刷新 updatedAt', () => {
    const a = fs({ title: 'a' });
    const b = fs({ title: 'b' });
    const p = project([a, b]);
    const updated = updateForeshadow(p, a.id, { importance: 'critical' }, 9999);
    expect(updated.foreshadows?.find((f) => f.id === a.id)?.importance).toBe('critical');
    expect(updated.foreshadows?.find((f) => f.id === a.id)?.updatedAt).toBe(9999);
    expect(updated.foreshadows?.find((f) => f.id === b.id)?.importance).not.toBe('critical');
  });

  it('remove 过滤目标', () => {
    const a = fs();
    const p = project([a, fs()]);
    expect(removeForeshadow(p, a.id).foreshadows).toHaveLength(1);
  });

  it('payOff 写入回收章节并置状态', () => {
    const a = fs();
    const p = payOffForeshadow(project([a]), a.id, { id: 'c3', order: 3 });
    const f = p.foreshadows?.[0];
    expect(f?.status).toBe('paid-off');
    expect(f?.payoffChapterId).toBe('c3');
    expect(f?.payoffChapterOrder).toBe(3);
  });

  it('setStatus 切换状态', () => {
    const a = fs();
    expect(setStatus(project([a]), a.id, 'abandoned').foreshadows?.[0]!.status).toBe('abandoned');
  });
});

describe('openForeshadows 排序', () => {
  it('只返回 planted，按重要度再按埋设顺序', () => {
    const p = project([
      fs({ title: 'minor-late', importance: 'minor', plantedChapterOrder: 5 }),
      fs({ title: 'critical', importance: 'critical', plantedChapterOrder: 8 }),
      fs({ title: 'major-early', importance: 'major', plantedChapterOrder: 1 }),
      fs({ title: 'done', importance: 'critical', status: 'paid-off' }),
    ]);
    expect(openForeshadows(p).map((f) => f.title)).toEqual(['critical', 'major-early', 'minor-late']);
  });
});

describe('overdueForeshadows', () => {
  it('埋设后跨度达阈值仍未回收则超期', () => {
    const p = project([
      fs({ title: 'old', plantedChapterOrder: 0 }),
      fs({ title: 'recent', plantedChapterOrder: 9 }),
      fs({ title: 'noplace' }),
    ]);
    const overdue = overdueForeshadows(p, 10, 10).map((f) => f.title);
    expect(overdue).toContain('old');
    expect(overdue).not.toContain('recent');
    expect(overdue).not.toContain('noplace'); // 无埋设章节不计超期
  });
});

describe('foreshadowCounts', () => {
  it('分类统计', () => {
    const p = project([
      fs({ status: 'planted' }),
      fs({ status: 'planted' }),
      fs({ status: 'paid-off' }),
      fs({ status: 'abandoned' }),
    ]);
    expect(foreshadowCounts(p)).toEqual({ total: 4, planted: 2, paidOff: 1, abandoned: 1 });
  });
});

describe('buildForeshadowContextForPrompt', () => {
  it('无未回收伏笔返回空串', () => {
    expect(buildForeshadowContextForPrompt(project([fs({ status: 'paid-off' })]), 5)).toBe('');
  });

  it('列出截至当前进度已埋设的未回收伏笔', () => {
    const p = project([
      fs({ title: '已埋', importance: 'critical', plantedChapterOrder: 2 }),
      fs({ title: '未来才埋', plantedChapterOrder: 20 }),
      fs({ title: '未定章节', plantedChapterOrder: undefined }),
    ]);
    const ctx = buildForeshadowContextForPrompt(p, 5);
    expect(ctx).toContain('已埋');
    expect(ctx).toContain('未定章节');
    expect(ctx).not.toContain('未来才埋');
    expect(ctx).toContain('[关键]');
  });
});
