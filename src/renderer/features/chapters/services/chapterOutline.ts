/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 章节细纲：AI 文本解析与上下文块拼装（纯函数，便于单测）。
 */
import { type Chapter, type Project } from '../../../../shared/types';
import { uuidv7 } from '@core/entities';
import { roleLabel } from '@/shared/utils/displayLabels';

const CHAPTER_REGEX = /第\s*([0-9一二三四五六七八九十百]+)\s*章[:：]?\s*([^\n]+)([\s\S]*?)(?=第\s*[0-9一二三四五六七八九十百]+\s*章|---|$(?![\s\S]))/gi;
const SUMMARY_MARKERS = ['剧情细纲[:：]', '内容[:：]', '情节[:：]', '本章细纲[:：]'];

export interface ParseChapterFallbacks {
  /** 无标题时的默认章节名，入参为 1 起的章节号。 */
  titleFor: (num: number) => string;
  /** 无细纲时的默认文案。 */
  defaultSummary: string;
}

/** 解析 AI 输出的章节文本为 Chapter（id 新生成，order 从 startIndex 递增）。 */
export function parseChaptersFromAI(text: string, startIndex: number, fallbacks: ParseChapterFallbacks): Chapter[] {
  const matches = Array.from(text.matchAll(CHAPTER_REGEX));
  return matches.map((match, idx) => {
    const titleRaw = match[2]?.trim() ?? '';
    const bodyRaw = match[3]?.trim() ?? '';
    const title = titleRaw.replace(/[#*]/g, '').trim();

    let summary = bodyRaw;
    for (const marker of SUMMARY_MARKERS) {
      const regex = new RegExp(marker, 'i');
      const markerMatch = bodyRaw.match(regex);
      if (markerMatch && markerMatch.index !== undefined) {
        summary = bodyRaw.substring(markerMatch.index + markerMatch[0].length).trim();
        break;
      }
    }
    summary = summary.split('---')[0]?.trim() ?? '';

    return {
      id: uuidv7(),
      title: title || fallbacks.titleFor(startIndex + idx + 1),
      summary: summary || fallbacks.defaultSummary,
      content: '',
      order: startIndex + idx,
    };
  });
}

/** 章节 prompt 上下文块：人物设定 + 书名简介（模板无占位符时追加，保证不断联）。 */
export function buildChapterContextBlock(p: Project): string {
  const charDetails = (p.characters ?? [])
    .slice(0, 12)
    .map((c) => `【${c.name}】(${roleLabel(c.role)})：${c.personality ?? ''}`)
    .join('\n');
  const parts = ['', '### 本书设定（规划细纲必须服从）', `书名：《${p.title}》`];
  if (p.intro?.trim()) parts.push(`简介：${p.intro}`);
  if (charDetails) parts.push(`人物：\n${charDetails}`);
  return parts.join('\n');
}
