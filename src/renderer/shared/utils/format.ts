/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 展示格式化的单源：字节数、百分比。 */

/** 字节数 → 人类可读（B/KB/MB，一位小数）。 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 0..1 比值 → 百分比字符串（一位小数）。 */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** 时间戳/日期串 → 本地日期（仅年月日）。 */
export function formatDate(value: number | string | Date, locale: string): string {
  return new Date(value).toLocaleDateString(locale);
}

/** 时间戳/日期串 → 本地日期时间。 */
export function formatDateTime(value: number | string | Date, locale: string): string {
  return new Date(value).toLocaleString(locale);
}
