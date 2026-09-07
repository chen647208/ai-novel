/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('拼接条件类', () => {
    const active = false;
    expect(cn('a', active && 'b', undefined, 'c')).toBe('a c');
  });

  it('tailwind 冲突消解：后写覆盖先写', () => {
    expect(cn('p-2 p-4')).toBe('p-4');
    expect(cn('bg-primary', 'bg-secondary')).toBe('bg-secondary');
  });

  it('不同工具族不互相覆盖', () => {
    const out = cn('p-2', 'bg-primary');
    expect(out).toContain('p-2');
    expect(out).toContain('bg-primary');
  });

  it('支持数组/对象形式', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });
});
