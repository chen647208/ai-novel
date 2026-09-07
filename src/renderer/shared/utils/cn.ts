/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 类名合并：clsx 条件拼接 + tailwind-merge 冲突消解（后写工具类覆盖先写）。
 * 所有 ui 组件的 className 透传都经过它，保证调用方可覆盖默认样式。
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
