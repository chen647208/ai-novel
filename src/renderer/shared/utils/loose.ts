/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * AI/JSON 宽松数据收窄工具。
 *
 * 模型返回的 JSON 结构不可信（缺字段、类型漂移、字符串数字混用），
 * 统一以 LooseRecord（Record<string, unknown>）承载，再用本模块的
 * 收窄函数逐字段转换为确定类型，替代满屏的 `any`。
 */

/** 宽松对象：来自 JSON.parse 的任意记录 */
export type LooseRecord = Record<string, unknown>;

/** 收窄为记录；非对象/数组/空值返回 {} */
export function asRecord(value: unknown): LooseRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as LooseRecord)
    : {};
}

/** 收窄为字符串；数字自动转文本，其余返回 fallback */
export function asStr(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

/** 收窄为数字；数字字符串自动转换，其余返回 fallback */
export function asNum(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

/** 收窄为字符串数组；非数组返回 []，元素逐个转字符串 */
export function asStrArr(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asStr(item)) : [];
}

/** 收窄为数字数组；非数组返回 []，非法元素转 0 */
export function asNumArr(value: unknown): number[] {
  return Array.isArray(value) ? value.map((item) => asNum(item)) : [];
}

/** 收窄为记录数组；非数组返回 []，元素逐个 asRecord */
export function asRecords(value: unknown): LooseRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}
