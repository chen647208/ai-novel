/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 写作统计（纯函数）：字数、段落、句子、阅读时长、全书进度。
 */
import type { Project } from '../../../../shared/types';
import { i18n } from '@/i18n';
import { DEFAULT_BUILD_PROFILE, runBuild } from '@core/build';
import { projectToBuildEntities } from '../utils';

export interface ChapterStats {
  /** 总字符数（含空白） */
  totalChars: number;
  /** 净字符数（去空白，中文语境下≈字数） */
  charCount: number;
  /** 段落数（非空行） */
  paragraphs: number;
  /** 句子数（按中英文句末标点粗分） */
  sentences: number;
  /** 预估阅读分钟数（按 400 字/分钟） */
  readingMinutes: number;
}

const READING_CHARS_PER_MINUTE = 400;

export function computeChapterStats(content: string): ChapterStats {
  const text = content ?? '';
  const charCount = text.replace(/\s+/g, '').length;
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0).length;
  const sentences = text.split(/[。！？!?.;；]+/).filter((s) => s.trim().length > 0).length;
  return {
    totalChars: text.length,
    charCount,
    paragraphs,
    sentences,
    readingMinutes: Math.max(charCount > 0 ? 1 : 0, Math.round(charCount / READING_CHARS_PER_MINUTE)),
  };
}

export interface BookStats {
  chapterCount: number;
  writtenChapterCount: number; // 有正文的章节数
  totalCharCount: number;
  /** 成稿字数：与导出同源的管线文本净字符数（07 §5-4 单一口径） */
  builtCharCount: number;
  todayCharCount: number; // 今日新增（基于快照差值，近似值）
  averageChapterChars: number;
}

export function computeBookStats(project: Project, now: number = Date.now()): BookStats {
  const chapters = project.chapters ?? [];
  const totalCharCount = chapters.reduce((sum, c) => sum + computeChapterStats(c.content).charCount, 0);
  const writtenChapters = chapters.filter((c) => (c.content ?? '').trim().length > 0);

  // 今日新增：每章取今日最早快照与当前内容之差的近似
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const dayStartMs = startOfDay.getTime();
  let todayCharCount = 0;
  for (const chapter of chapters) {
    const todaySnapshots = (chapter.snapshots ?? []).filter((s) => s.timestamp >= dayStartMs);
    const baseline = todaySnapshots.length > 0 ? todaySnapshots[0]?.charCount ?? 0 : 0;
    const current = computeChapterStats(chapter.content).charCount;
    if (current > baseline) todayCharCount += current - baseline;
  }

  // 成稿字数与导出走同一管线（默认 profile 的正文文本）
  const { text: builtText } = runBuild(DEFAULT_BUILD_PROFILE, projectToBuildEntities(project));

  return {
    chapterCount: chapters.length,
    writtenChapterCount: writtenChapters.length,
    totalCharCount,
    builtCharCount: computeChapterStats(builtText).charCount,
    todayCharCount,
    averageChapterChars: writtenChapters.length > 0 ? Math.round(totalCharCount / writtenChapters.length) : 0,
  };
}

/** 格式化字数显示（12345 → 1.2万；英文语境显示 1.2×10k） */
export function formatCharCount(count: number): string {
  if (count < 10000) return String(count);
  return `${(count / 10000).toFixed(1)}${i18n.t('writing:stats.wan')}`;
}
