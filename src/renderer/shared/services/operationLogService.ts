/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 操作日志读取：包装 repository 的可选方法，后端不支持时返回空数组。 */
import { type OperationLogEntry,repository } from './repository';

export type { OperationLogEntry } from './repository';

export async function loadOperationLog(bookId: string, limit = 100): Promise<OperationLogEntry[]> {
  return (await repository.loadOperationLog?.(bookId, limit)) ?? [];
}
