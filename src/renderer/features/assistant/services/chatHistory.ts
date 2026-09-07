/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 会话历史纯函数（docs/design/11）：截断三档 + 压缩判定 + 新旧切分。
 * 无副作用、无网络，可单测；阈值见 shared/constants/chat.ts。
 */
import {
  COMPACT_THRESHOLD_CHARS,
  HISTORY_MAX_TURNS,
  HISTORY_TOTAL_CHARS,
  HISTORY_TURN_CHARS,
} from '../../../../shared/constants/chat';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const roleLabel = (role: ChatTurn['role']): string => (role === 'user' ? '用户' : '助手');

/** 单轮截断：超长标注已截断，避免无声丢信息。 */
function truncateTurn(content: string): string {
  const text = content.trim();
  if (text.length <= HISTORY_TURN_CHARS) return text;
  return text.slice(0, HISTORY_TURN_CHARS) + '…（本轮过长已截断）';
}

/**
 * 历史拼装：取最近 N 轮 → 单轮截断 → 总量超限从旧往新丢轮。
 * 空历史返回 ''（historySection 渲染空即跳过）。
 */
export function buildHistoryText(turns: ChatTurn[]): string {
  const recent = turns.filter((t) => t.content.trim()).slice(-HISTORY_MAX_TURNS);
  const blocks = recent.map((t) => `${roleLabel(t.role)}：${truncateTurn(t.content)}`);
  while (blocks.join('\n').length > HISTORY_TOTAL_CHARS && blocks.length > 1) {
    blocks.shift();
  }
  return blocks.join('\n');
}

/** 压缩判定：原文超阈值则先摘要再发送。 */
export function needsCompaction(rawText: string): boolean {
  return rawText.length > COMPACT_THRESHOLD_CHARS;
}

/** 新旧切分：最旧一半拿去摘要，较新一半保留原文。 */
export function splitForCompaction<T>(turns: T[]): { old: T[]; recent: T[] } {
  const mid = Math.max(1, Math.floor(turns.length / 2));
  return { old: turns.slice(0, mid), recent: turns.slice(mid) };
}
