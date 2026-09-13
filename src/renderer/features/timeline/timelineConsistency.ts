/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 时间线的确定性一致性检查：纯本地规则，不调用模型。 */
import type { Project } from '@shared/types';

import { dateToOrdinal } from './timelineModel';

export type TimelineIssueCode = 'characterLocationConflict' | 'bornAfterAppearance' | 'foreshadowOrder' | 'missingEventLink';

export interface TimelineIssue {
  code: TimelineIssueCode;
  severity: 'error' | 'warning';
  targetId?: string;
  values: Record<string, string>;
}

export function checkTimelineConsistency(project: Project): TimelineIssue[] {
  const issues: TimelineIssue[] = [];
  const events = project.timeline?.events ?? [];
  const eventById = new Map(events.map((event) => [event.id, event]));
  const characterById = new Map((project.characters ?? []).map((character) => [character.id, character]));
  const locationName = new Map((project.locations ?? []).map((location) => [location.id, location.name]));

  // 同一角色在同一刻度出现在不同地点
  const byCharacter = new Map<string, typeof events>();
  for (const event of events) {
    for (const characterId of event.relatedCharacterIds ?? []) {
      const list = byCharacter.get(characterId);
      if (list) list.push(event);
      else byCharacter.set(characterId, [event]);
    }
  }
  for (const [characterId, characterEvents] of byCharacter) {
    const character = characterById.get(characterId);
    if (!character) continue;
    const byOrdinal = new Map<number, typeof events>();
    for (const event of characterEvents) {
      const ordinal = dateToOrdinal(event.date);
      if (ordinal === null || !event.relatedLocationIds?.length) continue;
      const list = byOrdinal.get(ordinal);
      if (list) list.push(event);
      else byOrdinal.set(ordinal, [event]);
    }
    for (const [ordinal, sameTime] of byOrdinal) {
      if (sameTime.length < 2) continue;
      const placeSets = sameTime.map((event) => new Set(event.relatedLocationIds ?? []));
      const disjoint = placeSets.some((set, index) => placeSets.some((other, otherIndex) => index < otherIndex && [...set].every((id) => !other.has(id))));
      if (disjoint) {
        const names = [...new Set(sameTime.flatMap((event) => (event.relatedLocationIds ?? []).map((id) => locationName.get(id) ?? id)))];
        issues.push({
          code: 'characterLocationConflict',
          severity: 'warning',
          targetId: characterId,
          values: { character: character.name, time: String(ordinal), places: names.join(' / ') },
        });
      }
    }
  }

  // 角色在出生年份之前登场
  for (const character of project.characters ?? []) {
    const birthYear = character.birthDate?.year;
    if (typeof birthYear !== 'number') continue;
    for (const event of events) {
      if (!event.relatedCharacterIds?.includes(character.id)) continue;
      if (event.date.year < birthYear) {
        issues.push({
          code: 'bornAfterAppearance',
          severity: 'error',
          targetId: character.id,
          values: { character: character.name, birthYear: String(birthYear), event: event.title, year: String(event.date.year) },
        });
        break;
      }
    }
  }

  // 伏笔回收早于埋设
  for (const foreshadow of project.foreshadows ?? []) {
    const planted = foreshadow.plantedChapterOrder;
    const payoff = foreshadow.payoffChapterOrder;
    if (typeof planted === 'number' && typeof payoff === 'number' && payoff < planted) {
      issues.push({
        code: 'foreshadowOrder',
        severity: 'error',
        targetId: foreshadow.id,
        values: { title: foreshadow.title },
      });
    }
  }

  // 章节指向不存在的事件
  for (const chapter of project.chapters ?? []) {
    if (chapter.timelineEventId && !eventById.has(chapter.timelineEventId)) {
      issues.push({
        code: 'missingEventLink',
        severity: 'warning',
        targetId: chapter.id,
        values: { chapter: chapter.title },
      });
    }
  }

  return issues;
}
