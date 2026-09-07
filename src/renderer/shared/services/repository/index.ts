/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { StorageRepository } from './types';
import { jsonRepository } from './jsonRepository';
import { SqliteRepository } from './sqliteRepository';
import { IpcSqlDriver } from './ipcDriver';
import { WasmSqliteDriver } from './wasmDriver';

/**
 * 应用数据的唯一入口。UI/App 一律 `import { repository }` 而非具体后端。
 *
 * 按运行环境探测选择：
 *   - 桌面(Electron，有 electronAPI.db) → SQLite(IpcSqlDriver → 主进程 node:sqlite)
 *   - 安全上下文的浏览器(有 OPFS)        → SQLite(WasmSqliteDriver → worker + 官方 sqlite-wasm + OPFS)
 *   - 其余(非安全上下文/无 OPFS 的过渡)  → jsonRepository(localStorage)
 */
function opfsAvailable(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.storage?.getDirectory &&
    (typeof window === 'undefined' || window.isSecureContext)
  );
}

function selectRepository(): StorageRepository {
  const db = typeof window !== 'undefined' ? window.electronAPI?.db : undefined;
  if (db) return new SqliteRepository(new IpcSqlDriver(db));
  if (opfsAvailable()) return new SqliteRepository(new WasmSqliteDriver());
  return jsonRepository;
}

export const repository: StorageRepository = selectRepository();

export type { StorageRepository, SqlDriver, SqlValue, SqlRunResult } from './types';
