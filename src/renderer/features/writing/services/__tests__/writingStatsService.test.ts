/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { describe, it, expect } from 'vitest';
import type { Project } from '../../../../../shared/types';
import { computeChapterStats, computeBookStats, formatCharCount } from '../writingStatsService';

describe('computeChapterStats', () => {
  it('统计净字数/段落/句子', () => {
    const stats = computeChapterStats('第一句。第二句！\n\n第二段话，还有第三句。\n   \n最后一段。');
    expect(stats.charCount).toBe(('第一句。第二句！第二段话，还有第三句。最后一段。').replace(/\s/g, '').length);
    expect(stats.paragraphs).toBe(3);
    expect(stats.sentences).toBe(4); // 第一句/第二句/第二段话，还有第三句/最后一段
  });

  it('空内容各项为 0', () => {
    const stats = computeChapterStats('');
    expect(stats.charCount).toBe(0);
    expect(stats.paragraphs).toBe(0);
    expect(stats.readingMinutes).toBe(0);
  });

  it('非空内容阅读时长至少 1 分钟', () => {
    expect(computeChapterStats('一句话').readingMinutes).toBe(1);
  });
});

describe('computeBookStats', () => {
  const project = (chapters: Project['chapters']): Project =>
    ({ title: '书', chapters } as Project);

  const chapter = (id: string, content: string, snapshots?: Project['chapters'][number]['snapshots']) =>
    ({ id, title: id, summary: '', content, order: 0, snapshots });

  it('汇总全书字数与完成章节数', () => {
    const p = project([chapter('c1', '一二三'), chapter('c2', ''), chapter('c3', '四五六七八')]);
    const stats = computeBookStats(p);
    expect(stats.chapterCount).toBe(3);
    expect(stats.writtenChapterCount).toBe(2);
    expect(stats.totalCharCount).toBe(8);
    expect(stats.averageChapterChars).toBe(4);
  });

  it('今日新增基于当日最早快照与当前内容之差', () => {
    const now = Date.now();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const morningSnap = { id: 's1', content: 'x'.repeat(100), timestamp: dayStart.getTime() + 60_000, charCount: 100, source: 'auto' as const };
    const p = project([chapter('c1', 'x'.repeat(350), [morningSnap])]);
    const stats = computeBookStats(p, now);
    expect(stats.todayCharCount).toBe(250);
  });

  it('内容比基线少时不计负增量', () => {
    const now = Date.now();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const snap = { id: 's1', content: 'x'.repeat(500), timestamp: dayStart.getTime() + 60_000, charCount: 500, source: 'auto' as const };
    const p = project([chapter('c1', 'x'.repeat(100), [snap])]);
    expect(computeBookStats(p, now).todayCharCount).toBe(0);
  });
});

describe('formatCharCount', () => {
  it('小于一万原样', () => expect(formatCharCount(9999)).toBe('9999'));
  it('大于一万转万', () => {
    expect(formatCharCount(12345)).toBe('1.2万');
    expect(formatCharCount(100000)).toBe('10.0万');
  });
});
