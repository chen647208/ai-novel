/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { i18n } from './config';

/**
 * 数据目录型译文（服务商名称/描述/提示等）以「运行时组合的字符串键」取词，
 * 且含数组值，无法纳入编译期类型化键。此助手绕过键类型检查，按调用时语言解析；
 * 键的存在性与中英一致性由 i18n/__tests__/dictionaries.test.ts 兜底。
 * 仅在渲染期/调用期使用（禁止 import 期定值），语言切换由组件的 useTranslation 触发重渲染。
 */
const tRaw = i18n.t.bind(i18n) as (key: string, options?: Record<string, unknown>) => string;

/** 取单个字符串译文（按调用时语言）。 */
export function dt(key: string, options?: Record<string, unknown>): string {
  return tRaw(key, options);
}

/**
 * 提示词模板显示名：内置默认模板带 nameKey（i18n 键），按调用时语言解析；
 * 用户自定义或已改名的模板无 nameKey，直接用字面 name。
 * 模板 name 同时作为数据兜底（如导出/历史元数据），显示一律走本助手。
 */
export function templateDisplayName(template: { name: string; nameKey?: string }): string {
  return template.nameKey ? dt(template.nameKey) : template.name;
}

/** 取数组型译文（如服务商提示列表）；非数组或缺失时返回空数组。 */
export function dtList(key: string): string[] {
  const value = (i18n.t.bind(i18n) as (k: string, o?: Record<string, unknown>) => unknown)(key, {
    returnObjects: true,
  });
  return Array.isArray(value) ? (value as string[]) : [];
}

/**
 * 取对象/对象数组型译文（如版本更新日志映射、版本历史条目数组）。
 * 键含点号（版本号）或值为对象数组时无法用类型化键或 dtList，按调用时语言以 returnObjects 解析。
 * 缺失或非对象时返回 fallback（默认空对象），调用方自行按结构使用。
 */
export function dtObject<T>(key: string, fallback: T): T {
  const value = (i18n.t.bind(i18n) as (k: string, o?: Record<string, unknown>) => unknown)(key, {
    returnObjects: true,
  });
  return value && typeof value === 'object' ? (value as T) : fallback;
}
