/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 章节快照服务（纯函数）：
 * 手动编辑内容的定时/事件快照，用于误删、误覆盖后的恢复。
 * 与 AI 历史（history）互补：history 记录 AI 生成，snapshots 记录人工编辑。
 */
import type { Chapter, ChapterSnapshot } from '../../../../shared/types';

/** 单章保留的最大快照数，超出按时间淘汰最旧 */
export const MAX_SNAPSHOTS_PER_CHAPTER = 20;
/** 自动快照最小间隔（毫秒） */
export const AUTO_SNAPSHOT_INTERVAL_MS = 2 * 60 * 1000;
/** 大幅改动阈值（字符数）：未达间隔但单次变化超过此值也立即快照 */
export const AUTO_SNAPSHOT_LARGE_DELTA = 1000;

export function createSnapshot(content: string, source: ChapterSnapshot['source'], now: number = Date.now()): ChapterSnapshot {
  return {
    id: `snap_${now}_${Math.random().toString(36).slice(2, 9)}`,
    content,
    timestamp: now,
    charCount: content.replace(/\s+/g, '').length,
    source,
  };
}

/** 追加快照并维持数量上限（返回新 Chapter，不修改入参） */
export function appendSnapshot(chapter: Chapter, snapshot: ChapterSnapshot): Chapter {
  const snapshots = [...(chapter.snapshots ?? []), snapshot];
  const trimmed = snapshots.length > MAX_SNAPSHOTS_PER_CHAPTER
    ? snapshots.slice(snapshots.length - MAX_SNAPSHOTS_PER_CHAPTER)
    : snapshots;
  return { ...chapter, snapshots: trimmed };
}

/**
 * 判断当前内容是否需要一次自动快照：
 * - 内容为空不快照
 * - 与最近快照内容相同不快照
 * - 距最近快照不足间隔且变化量不足阈值时不快照（避免高频小改动刷掉旧快照）
 */
export function shouldAutoSnapshot(chapter: Chapter, now: number = Date.now()): boolean {
  const content = chapter.content ?? '';
  if (content.trim().length === 0) return false;

  const snapshots = chapter.snapshots ?? [];
  if (snapshots.length === 0) return true;

  const latest = snapshots[snapshots.length - 1];
  if (!latest || latest.content === content) return false;

  const elapsed = now - latest.timestamp;
  const delta = Math.abs(content.length - latest.content.length);
  return elapsed >= AUTO_SNAPSHOT_INTERVAL_MS || delta >= AUTO_SNAPSHOT_LARGE_DELTA;
}

/** 按快照 ID 取出内容（用于恢复），不存在返回 null */
export function getSnapshotContent(chapter: Chapter, snapshotId: string): string | null {
  return chapter.snapshots?.find((s) => s.id === snapshotId)?.content ?? null;
}

/** 删除一个快照 */
export function removeSnapshot(chapter: Chapter, snapshotId: string): Chapter {
  return { ...chapter, snapshots: (chapter.snapshots ?? []).filter((s) => s.id !== snapshotId) };
}

/** 快照列表按时间倒序（UI 展示用） */
export function listSnapshots(chapter: Chapter): ChapterSnapshot[] {
  return [...(chapter.snapshots ?? [])].sort((a, b) => b.timestamp - a.timestamp);
}
