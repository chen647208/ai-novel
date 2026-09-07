/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import type { Chapter } from '../../../../../shared/types';
import {
  createSnapshot,
  appendSnapshot,
  shouldAutoSnapshot,
  getSnapshotContent,
  removeSnapshot,
  listSnapshots,
  MAX_SNAPSHOTS_PER_CHAPTER,
  AUTO_SNAPSHOT_INTERVAL_MS,
  AUTO_SNAPSHOT_LARGE_DELTA,
} from '../chapterSnapshotService';

const chapter = (over: Partial<Chapter> = {}): Chapter => ({
  id: 'c1',
  title: '第一章',
  summary: '',
  content: '',
  order: 0,
  ...over,
});

describe('createSnapshot', () => {
  it('统计净字符数并记录来源', () => {
    const snap = createSnapshot('你好 世界\n测试', 'manual', 1000);
    expect(snap.charCount).toBe(6);
    expect(snap.source).toBe('manual');
    expect(snap.timestamp).toBe(1000);
    expect(snap.id).toMatch(/^snap_1000_/);
  });
});

describe('appendSnapshot', () => {
  it('不修改原 chapter（纯函数）', () => {
    const c = chapter();
    appendSnapshot(c, createSnapshot('x', 'auto'));
    expect(c.snapshots).toBeUndefined();
  });

  it('超出上限时淘汰最旧快照', () => {
    let c = chapter();
    for (let i = 0; i < MAX_SNAPSHOTS_PER_CHAPTER + 5; i++) {
      c = appendSnapshot(c, createSnapshot(`content-${i}`, 'auto', 1000 + i));
    }
    expect(c.snapshots).toHaveLength(MAX_SNAPSHOTS_PER_CHAPTER);
    expect(c.snapshots?.[0]!.content).toBe('content-5'); // 最旧的 5 个被淘汰
  });
});

describe('shouldAutoSnapshot', () => {
  const now = 1_000_000;

  it('空内容不快照', () => {
    expect(shouldAutoSnapshot(chapter({ content: '   \n ' }), now)).toBe(false);
  });

  it('无历史快照时首次内容即快照', () => {
    expect(shouldAutoSnapshot(chapter({ content: '开篇' }), now)).toBe(true);
  });

  it('内容与最近快照相同不快照', () => {
    const snap = createSnapshot('开篇', 'auto', now - 10);
    const c = chapter({ content: '开篇', snapshots: [snap] });
    expect(shouldAutoSnapshot(c, now)).toBe(false);
  });

  it('达到时间间隔即快照', () => {
    const snap = createSnapshot('旧内容', 'auto', now - AUTO_SNAPSHOT_INTERVAL_MS);
    const c = chapter({ content: '旧内容改了一点', snapshots: [snap] });
    expect(shouldAutoSnapshot(c, now)).toBe(true);
  });

  it('未达间隔但变化巨大即快照', () => {
    const big = 'x'.repeat(AUTO_SNAPSHOT_LARGE_DELTA + 10);
    const snap = createSnapshot('短', 'auto', now - 1000);
    const c = chapter({ content: big, snapshots: [snap] });
    expect(shouldAutoSnapshot(c, now)).toBe(true);
  });

  it('未达间隔且变化小则不快照', () => {
    const snap = createSnapshot('a'.repeat(500), 'auto', now - 1000);
    const c = chapter({ content: 'a'.repeat(550), snapshots: [snap] });
    expect(shouldAutoSnapshot(c, now)).toBe(false);
  });
});

describe('getSnapshotContent / removeSnapshot / listSnapshots', () => {
  it('按 id 取回内容', () => {
    const snap = createSnapshot('恢复我', 'before-clear', 5);
    const c = appendSnapshot(chapter(), snap);
    expect(getSnapshotContent(c, snap.id)).toBe('恢复我');
    expect(getSnapshotContent(c, 'nope')).toBeNull();
  });

  it('删除指定快照', () => {
    const s1 = createSnapshot('a', 'auto', 1);
    const s2 = createSnapshot('b', 'auto', 2);
    let c = appendSnapshot(appendSnapshot(chapter(), s1), s2);
    c = removeSnapshot(c, s1.id);
    expect(c.snapshots).toHaveLength(1);
    expect(c.snapshots?.[0]!.id).toBe(s2.id);
  });

  it('列表按时间倒序', () => {
    const s1 = createSnapshot('a', 'auto', 1);
    const s2 = createSnapshot('b', 'auto', 2);
    const c = appendSnapshot(appendSnapshot(chapter(), s1), s2);
    expect(listSnapshots(c).map((s) => s.content)).toEqual(['b', 'a']);
  });
});
