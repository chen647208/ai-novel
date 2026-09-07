/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 会话归档读取：userData/ai-sessions/<bookId>/*.jsonl → 事件列表（事件浏览器消费）。 */
import { parseEventLine, type AiEvent } from '@core/ai';

export interface SessionArchiveEntry {
  sessionId: string;
  fileName: string;
  events: AiEvent[];
  startedAt?: number;
  task?: string;
  ok?: boolean;
}

function electron(): NonNullable<Window['electronAPI']> {
  if (!window.electronAPI) {
    throw new Error('electronAPI 不可用（预览环境无文件系统）');
  }
  return window.electronAPI;
}

/** 列出某本书的全部会话归档，按开始时间倒序。 */
export async function listSessionArchives(bookId: string): Promise<SessionArchiveEntry[]> {
  const base = await electron().getAppDataPath();
  const dir = `${base}/ai-sessions/${bookId}`;
  const dirEntries = await electron().listDirectory(dir);
  const fileNames = dirEntries.filter((e) => e.type === 'file' && e.name.endsWith('.jsonl')).map((e) => e.name);
  const entries: SessionArchiveEntry[] = [];

  for (const fileName of fileNames) {
    try {
      const content = await electron().readFile(`${dir}/${fileName}`);
      const events = content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => parseEventLine(line))
        .filter((e): e is AiEvent => e !== null);
      const start = events.find((e) => e.t === 'session.start');
      const end = events.at(-1);
      entries.push({
        sessionId: fileName.replace(/\.jsonl$/, ''),
        fileName,
        events,
        startedAt: start?.at,
        task: start?.t === 'session.start' ? start.task : undefined,
        ok: end?.t === 'session.end' ? end.ok : undefined,
      });
    } catch {
      // 单文件读取失败跳过（损坏归档不阻断列表）
    }
  }

  return entries.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}

/** 单会话用量汇总（事件浏览器消费；缺字段事件按 0 计）。 */
export interface SessionUsageSummary {
  turns: number;
  llmCalls: number;
  prompt: number;
  completion: number;
  total: number;
  cacheRead: number;
  cacheWrite: number;
  toolCalls: number;
}

export function summarizeSessionUsage(events: AiEvent[]): SessionUsageSummary {
  const summary: SessionUsageSummary = {
    turns: 0,
    llmCalls: 0,
    prompt: 0,
    completion: 0,
    total: 0,
    cacheRead: 0,
    cacheWrite: 0,
    toolCalls: 0,
  };
  for (const e of events) {
    if (e.t === 'turn.end') summary.turns = Math.max(summary.turns, e.turns);
    else if (e.t === 'llm.done') {
      summary.llmCalls += 1;
      const tokens = e.tokens as
        | { prompt?: number; completion?: number; total?: number; cacheRead?: number; cacheWrite?: number }
        | undefined;
      summary.prompt += tokens?.prompt ?? 0;
      summary.completion += tokens?.completion ?? 0;
      summary.total += tokens?.total ?? (tokens?.prompt ?? 0) + (tokens?.completion ?? 0);
      summary.cacheRead += tokens?.cacheRead ?? 0;
      summary.cacheWrite += tokens?.cacheWrite ?? 0;
    } else if (e.t === 'tool.call') {
      summary.toolCalls += 1;
    }
  }
  return summary;
}
