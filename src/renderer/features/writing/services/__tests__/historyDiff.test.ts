/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { diffLines } from '../historyDiff';

describe('diffLines', () => {
  it('相同文本全 same', () => {
    expect(diffLines('a\nb', 'a\nb')).toEqual([
      { type: 'same', text: 'a' },
      { type: 'same', text: 'b' },
    ]);
  });

  it('增删改三类齐全', () => {
    const out = diffLines('a\nb\nc', 'a\nB\nc\nd');
    expect(out).toEqual([
      { type: 'same', text: 'a' },
      { type: 'del', text: 'b' },
      { type: 'add', text: 'B' },
      { type: 'same', text: 'c' },
      { type: 'add', text: 'd' },
    ]);
  });

  it('空对空与单边空', () => {
    expect(diffLines('', '')).toEqual([{ type: 'same', text: '' }]);
    expect(diffLines('', 'x')).toEqual([
      { type: 'del', text: '' },
      { type: 'add', text: 'x' },
    ]);
  });

  it('重建文本与目标一致（往返保真）', () => {
    const oldText = '第一章\n林渊推门\n雨很大';
    const newText = '第一章\n林渊推门而入\n雨很大\n灯亮了';
    const out = diffLines(oldText, newText);
    expect(out.filter((l) => l.type !== 'del').map((l) => l.text).join('\n')).toBe(newText);
    expect(out.filter((l) => l.type !== 'add').map((l) => l.text).join('\n')).toBe(oldText);
  });
});
