/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import {
  COMPACT_THRESHOLD_CHARS,
  HISTORY_MAX_TURNS,
  HISTORY_TOTAL_CHARS,
} from '../../../../../shared/constants/chat';
import { buildHistoryText, type ChatTurn,needsCompaction, splitForCompaction } from '../chatHistory';

const turn = (role: ChatTurn['role'], content: string): ChatTurn => ({ role, content });

describe('buildHistoryText', () => {
  it('空历史返回空字符串（section 跳过）', () => {
    expect(buildHistoryText([])).toBe('');
    expect(buildHistoryText([turn('user', '   ')])).toBe('');
  });

  it('用户/助手标注拼装', () => {
    const text = buildHistoryText([turn('user', '第一章主角叫什么'), turn('assistant', '叫林渊')]);
    expect(text).toContain('用户：第一章主角叫什么');
    expect(text).toContain('助手：叫林渊');
  });

  it('只取最近 N 轮', () => {
    const turns = Array.from({ length: HISTORY_MAX_TURNS + 4 }, (_, i) => turn('user', `q${i}`));
    const text = buildHistoryText(turns);
    expect(text).not.toContain('q0');
    expect(text).toContain(`q${HISTORY_MAX_TURNS + 3}`);
  });

  it('总量超限从旧往新丢轮', () => {
    const big = 'x'.repeat(HISTORY_TOTAL_CHARS);
    const text = buildHistoryText([turn('user', big), turn('assistant', 'ok')]);
    expect(text.length).toBeLessThanOrEqual(HISTORY_TOTAL_CHARS + 100);
    expect(text).toContain('ok');
  });
});

describe('needsCompaction', () => {
  it('阈值上下判定', () => {
    expect(needsCompaction('x'.repeat(COMPACT_THRESHOLD_CHARS))).toBe(false);
    expect(needsCompaction('x'.repeat(COMPACT_THRESHOLD_CHARS + 1))).toBe(true);
  });
});

describe('splitForCompaction', () => {
  it('最旧一半拿去摘要', () => {
    const { old, recent } = splitForCompaction([1, 2, 3, 4, 5, 6]);
    expect(old).toEqual([1, 2, 3]);
    expect(recent).toEqual([4, 5, 6]);
  });

  it('单轮不切空', () => {
    const { old, recent } = splitForCompaction([1]);
    expect(old).toEqual([1]);
    expect(recent).toEqual([]);
  });
});
