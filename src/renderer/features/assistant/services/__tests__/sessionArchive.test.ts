/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import type { AiEvent } from '@core/ai';
import { summarizeSessionUsage } from '../sessionArchive';

const at = 1;

describe('summarizeSessionUsage', () => {
  it('累计轮次/调用/用量与缓存命中', () => {
    const cachedTokens = { prompt: 1300, completion: 50, total: 1350, cacheRead: 1100, cacheWrite: 100 };
    const events: AiEvent[] = [
      { t: 'session.start', sessionId: 's', task: '写', sections: [], at },
      { t: 'turn.start', turn: 1, at },
      { t: 'llm.done', turn: 1, tokens: { prompt: 1200, completion: 30, total: 1230 }, at },
      { t: 'tool.call', turn: 1, callId: 'c1', toolId: 'core.chapter.read', args: {}, at },
      { t: 'tool.result', turn: 1, callId: 'c1', ok: true, at },
      { t: 'turn.end', turn: 1, turns: 1, at },
      { t: 'turn.start', turn: 2, at },
      { t: 'llm.done', turn: 2, tokens: cachedTokens, at } as AiEvent,
      { t: 'turn.end', turn: 2, turns: 2, at },
      { t: 'session.end', ok: true, at },
    ];
    const s = summarizeSessionUsage(events);
    expect(s).toEqual({
      turns: 2,
      llmCalls: 2,
      prompt: 2500,
      completion: 80,
      total: 2580,
      cacheRead: 1100,
      cacheWrite: 100,
      toolCalls: 1,
    });
  });

  it('缺 tokens 字段的事件按 0 计', () => {
    const events: AiEvent[] = [
      { t: 'llm.done', turn: 1, at },
      { t: 'turn.end', turn: 1, turns: 1, at },
    ];
    expect(summarizeSessionUsage(events)).toEqual({
      turns: 1,
      llmCalls: 1,
      prompt: 0,
      completion: 0,
      total: 0,
      cacheRead: 0,
      cacheWrite: 0,
      toolCalls: 0,
    });
  });

  it('空事件返回零汇总', () => {
    expect(summarizeSessionUsage([]).total).toBe(0);
  });
});
