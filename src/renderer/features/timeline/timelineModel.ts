/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 双轴时间线模型：叙事顺序轴按章节 order，故事时间轴按事件日期。 */
import type { HistoryDate, Project } from '@shared/types';

import type { SequenceItem } from '@/app/stores/genericModelStore';

export type TimelineAxisId = 'narrative' | 'story';

export interface TimelineClip {
  /** `chapter:<id>` 或 `event:<id>`，保证全局唯一。 */
  id: string;
  kind: 'chapter' | 'event';
  entityId: string;
  label: string;
  /** 轴内起始刻度（叙事轴为序号，故事轴为日期序数）。 */
  start: number;
  duration: number;
  importance: 'major' | 'minor';
  /** 合并分组的组节点 id；未分组为 undefined。 */
  groupId?: string;
  /** 同一刻度的堆叠层，避免重叠。 */
  lane?: number;
}

export interface TimelineLink {
  fromClipId: string;
  toClipId: string;
  label: 'depicts';
}

export interface TimelineAxis {
  id: TimelineAxisId;
  clips: TimelineClip[];
}

export interface TimelineModel {
  axes: TimelineAxis[];
  links: TimelineLink[];
  minStart: number;
  maxEnd: number;
}

/** 历史日期转可比较序数：以「月」为刻度，年内按天做小数偏移。 */
export function dateToOrdinal(date: HistoryDate | undefined): number | null {
  if (!date) return null;
  const month = date.month ?? 1;
  const day = date.day ?? 1;
  return date.year * 12 + (month - 1) + (day - 1) / 31;
}

/** 吸附：在 threshold 内贴近最近的候选刻度，否则返回原值。 */
export function snapTo(value: number, candidates: number[], threshold: number): number {
  let best = value;
  let bestDistance = threshold;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

export function buildTimelineModel(project: Project, sequence: SequenceItem[] = []): TimelineModel {
  const parentOf = new Map<string, string>();
  for (const item of sequence) {
    if (item.parentId) parentOf.set(item.nodeId, item.parentId);
  }

  const chapters = [...(project.chapters ?? [])].sort((a, b) => a.order - b.order);
  const narrativeClips: TimelineClip[] = chapters.map((chapter, index) => ({
    id: `chapter:${chapter.id}`,
    kind: 'chapter',
    entityId: chapter.id,
    label: chapter.title,
    start: index,
    duration: 1,
    importance: chapter.status === 'done' ? 'major' : 'minor',
    groupId: parentOf.get(chapter.id),
  }));

  const events = project.timeline?.events ?? [];
  const datedEvents = events
    .map((event) => ({ event, ordinal: dateToOrdinal(event.date) }))
    .filter((entry): entry is { event: (typeof events)[number]; ordinal: number } => entry.ordinal !== null)
    .sort((a, b) => a.ordinal - b.ordinal);

  const minOrdinal = datedEvents[0]?.ordinal ?? 0;
  const laneCount = new Map<number, number>();
  const storyClips: TimelineClip[] = datedEvents.map(({ event, ordinal }) => {
    const lane = laneCount.get(ordinal) ?? 0;
    laneCount.set(ordinal, lane + 1);
    return {
      id: `event:${event.id}`,
      kind: 'event',
      entityId: event.id,
      label: event.title,
      start: ordinal - minOrdinal,
      duration: 1,
      importance: event.significance ?? 'minor',
      lane,
    };
  });

  const eventIds = new Set(events.map((event) => event.id));
  const links: TimelineLink[] = [];
  for (const chapter of chapters) {
    if (chapter.timelineEventId && eventIds.has(chapter.timelineEventId)) {
      links.push({ fromClipId: `chapter:${chapter.id}`, toClipId: `event:${chapter.timelineEventId}`, label: 'depicts' });
    }
  }

  const narrativeMax = narrativeClips.reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0);
  const storyMax = storyClips.reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0);

  return {
    axes: [
      { id: 'narrative', clips: narrativeClips },
      { id: 'story', clips: storyClips },
    ],
    links,
    minStart: 0,
    maxEnd: Math.max(narrativeMax, storyMax),
  };
}
