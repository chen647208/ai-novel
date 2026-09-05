/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { asRecord, asStr, asNum, asStrArr, asNumArr, asRecords } from '../loose';

describe('asRecord', () => {
  it('普通对象原样返回', () => {
    const obj = { a: 1, b: 'x' };
    expect(asRecord(obj)).toBe(obj);
  });
  it('null/undefined/数组/原始值返回空对象', () => {
    expect(asRecord(null)).toEqual({});
    expect(asRecord(undefined)).toEqual({});
    expect(asRecord([1, 2])).toEqual({});
    expect(asRecord('str')).toEqual({});
    expect(asRecord(42)).toEqual({});
  });
});

describe('asStr', () => {
  it('字符串原样返回', () => {
    expect(asStr('hi')).toBe('hi');
    expect(asStr('')).toBe('');
  });
  it('数字自动转文本', () => {
    expect(asStr(42)).toBe('42');
    expect(asStr(0)).toBe('0');
    expect(asStr(-1.5)).toBe('-1.5');
  });
  it('其余类型返回 fallback（默认空串）', () => {
    expect(asStr(null)).toBe('');
    expect(asStr(undefined)).toBe('');
    expect(asStr(true)).toBe('');
    expect(asStr({}, 'N/A')).toBe('N/A');
    expect(asStr([], 'N/A')).toBe('N/A');
  });
});

describe('asNum', () => {
  it('有限数字原样返回', () => {
    expect(asNum(3)).toBe(3);
    expect(asNum(0)).toBe(0);
    expect(asNum(-2.5)).toBe(-2.5);
  });
  it('数字字符串自动转换', () => {
    expect(asNum('42')).toBe(42);
    expect(asNum(' 3.14 ')).toBe(3.14);
    expect(asNum('-7')).toBe(-7);
  });
  it('NaN/Infinity/非数字字符串/其余类型返回 fallback', () => {
    expect(asNum(Number.NaN)).toBe(0);
    expect(asNum(Number.POSITIVE_INFINITY)).toBe(0);
    expect(asNum('abc')).toBe(0);
    expect(asNum('')).toBe(0);
    expect(asNum('   ')).toBe(0);
    expect(asNum(null, -1)).toBe(-1);
    expect(asNum(true, -1)).toBe(-1);
  });
});

describe('asStrArr', () => {
  it('数组元素逐个转字符串', () => {
    expect(asStrArr(['a', 1, null, true])).toEqual(['a', '1', '', '']);
  });
  it('非数组返回空数组', () => {
    expect(asStrArr('abc')).toEqual([]);
    expect(asStrArr(null)).toEqual([]);
    expect(asStrArr({})).toEqual([]);
  });
});

describe('asNumArr', () => {
  it('数组元素逐个转数字，非法元素为 0', () => {
    expect(asNumArr([1, '2', 'x', null])).toEqual([1, 2, 0, 0]);
  });
  it('非数组返回空数组', () => {
    expect(asNumArr(5)).toEqual([]);
    expect(asNumArr(undefined)).toEqual([]);
  });
});

describe('asRecords', () => {
  it('数组元素逐个收窄为记录，非对象元素变空对象', () => {
    expect(asRecords([{ a: 1 }, 'x', null])).toEqual([{ a: 1 }, {}, {}]);
  });
  it('非数组返回空数组', () => {
    expect(asRecords({ a: 1 })).toEqual([]);
    expect(asRecords(null)).toEqual([]);
  });
});
