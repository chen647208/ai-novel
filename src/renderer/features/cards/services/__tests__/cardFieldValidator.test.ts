/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import {
  validateAndCompleteCardData,
  normalizeFieldValue,
  getFieldDefinitions,
  generateFieldReport,
} from '../cardFieldValidator';

describe('validateAndCompleteCardData', () => {
  it('完整数据应通过校验并保留原值', () => {
    const data = {
      name: '林晚',
      gender: 'female',
      age: '24',
      role: 'protagonist',
      personality: '冷静',
      appearance: '黑发',
      background: '孤儿',
      relationships: '师父',
      distinctiveFeatures: '左痣',
      occupation: '医师',
      motivation: '复仇',
      strengths: '毒理',
      weaknesses: '体弱',
      characterArc: '由恨入爱',
    };
    const result = validateAndCompleteCardData('character', data, 'proj-1');
    expect(result.isValid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
    expect(result.defaultedFields).toHaveLength(0);
    expect(result.completedData.name).toBe('林晚');
    expect(result.completedData.projectId).toBe('proj-1');
  });

  it('缺失必填字段应使用枚举默认值补全并标记无效', () => {
    const result = validateAndCompleteCardData('character', { name: '甲' }, 'proj-2');
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('gender');
    expect(result.completedData.gender).toBe('unknown');
    expect(result.completedData.role).toBe('supporting');
  });

  it('空字符串视为缺失', () => {
    const result = validateAndCompleteCardData('character', { name: '   ' }, 'proj-3');
    expect(result.missingFields).toContain('name');
    expect(result.completedData.name).toBe('未命名角色');
  });

  it('对象类型默认值应深拷贝，避免共享引用', () => {
    const defs = getFieldDefinitions('location');
    const geoDef = defs.find((d) => d.name === 'geography');
    expect(geoDef).toBeDefined();
    const r1 = validateAndCompleteCardData('location', {}, 'p');
    const r2 = validateAndCompleteCardData('location', {}, 'p');
    const geo1 = r1.completedData.geography as { terrain: string };
    const geo2 = r2.completedData.geography as { terrain: string };
    geo1.terrain = '沙漠';
    expect(geo2.terrain).not.toBe('沙漠');
  });

  it('应自动补充系统字段 id/projectId/createdAt/updatedAt', () => {
    const result = validateAndCompleteCardData('faction', {}, 'proj-9');
    expect(result.completedData.id).toMatch(/^faction_/);
    expect(result.completedData.projectId).toBe('proj-9');
    expect(typeof result.completedData.createdAt).toBe('number');
    expect(result.completedData.updatedAt as number).toBeGreaterThanOrEqual(result.completedData.createdAt as number);
  });
});

describe('normalizeFieldValue', () => {
  it('字符串字段应转为字符串', () => {
    expect(normalizeFieldValue('name', 123, 'string')).toBe('123');
  });

  it('数组字段对非数组输入应回退', () => {
    const out = normalizeFieldValue('tags', 'not-array', 'array');
    expect(Array.isArray(out)).toBe(true);
  });

  it('布尔字段应正确解析', () => {
    expect(normalizeFieldValue('flag', 'true', 'boolean')).toBe(true);
    expect(normalizeFieldValue('flag', 'false', 'boolean')).toBe(false);
  });

  it('布尔字段显式解析字符串陷阱值', () => {
    expect(normalizeFieldValue('flag', '0', 'boolean')).toBe(false);
    expect(normalizeFieldValue('flag', 'no', 'boolean')).toBe(false);
    expect(normalizeFieldValue('flag', '', 'boolean')).toBe(false);
    expect(normalizeFieldValue('flag', 'YES', 'boolean')).toBe(true);
    expect(normalizeFieldValue('flag', 1, 'boolean')).toBe(true);
  });

  it('数字字段非法值回退 0', () => {
    expect(normalizeFieldValue('n', '42', 'number')).toBe(42);
    expect(normalizeFieldValue('n', 'abc', 'number')).toBe(0);
  });

  it('数组字段逗号字符串拆分', () => {
    expect(normalizeFieldValue('tags', 'a, b ,,c', 'array')).toEqual(['a', 'b', 'c']);
    expect(normalizeFieldValue('tags', ['x'], 'array')).toEqual(['x']);
  });

  it('空值按期望类型给默认值', () => {
    expect(normalizeFieldValue('s', null, 'string')).toBe('');
    expect(normalizeFieldValue('n', undefined, 'number')).toBe(0);
    expect(normalizeFieldValue('a', null, 'array')).toEqual([]);
  });
});

describe('getFieldDefinitions', () => {
  it('已知命令返回非空字段定义', () => {
    const defs = getFieldDefinitions('character');
    expect(defs.length).toBeGreaterThan(0);
    expect(defs.some(d => d.name === 'name')).toBe(true);
  });

  it('未知命令返回空数组', () => {
    expect(getFieldDefinitions('no-such-command' as never)).toEqual([]);
  });
});

describe('generateFieldReport', () => {
  it('全部填充且无默认值时输出全填报告', () => {
    const report = generateFieldReport({
      isValid: true, missingFields: [], filledFields: ['name'], defaultedFields: [], completedData: {},
    });
    expect(report).not.toBe('');
    expect(report).not.toContain('name');
  });

  it('缺失/默认/已填字段分行报告', () => {
    const report = generateFieldReport({
      isValid: false, missingFields: ['性格'], filledFields: ['name', 'age'], defaultedFields: ['背景'], completedData: {},
    });
    const lines = report.split('\n');
    expect(lines.length).toBe(3);
    expect(report).toContain('性格');
    expect(report).toContain('背景');
  });

  it('仅默认值字段时输出默认行', () => {
    const report = generateFieldReport({
      isValid: true, missingFields: [], filledFields: [], defaultedFields: ['外观'], completedData: {},
    });
    expect(report).toContain('外观');
  });
});
