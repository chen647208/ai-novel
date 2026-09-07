/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { Database, CAPI } from '@sqlite.org/sqlite-wasm';
import type { SqlValue, SqlRunResult } from './types';

/**
 * 网页端 SQL 执行核心 —— 基于官方 @sqlite.org/sqlite-wasm 的 oo1 高层 API。
 *
 * 这段逻辑被两处复用：
 *   1) 浏览器 OPFS worker（WasmSqliteDriver 经 postMessage 转发到这里执行）；
 *   2) Node 测试驱动（用 :memory: 库直接跑同一套 SqliteRepository 测试）。
 * 因此网页 SQL 语义与桌面 node:sqlite 的一致性在此锁定，无需浏览器即可回归。
 *
 * 约定：值一律走 bind 参数，绝不拼接进 SQL 文本。exec 支持多语句；
 * run/all/get 均为单语句（repository 保证），故可安全携带 bind。
 */
export type WasmMethod = 'exec' | 'run' | 'all' | 'get';

export interface WasmRequest {
  method: WasmMethod;
  sql: string;
  params?: SqlValue[];
}

/** 在给定 oo1.DB 上同步执行一条请求，返回可直接结构化克隆的结果（对象/数组/标量）。 */
export function runWasmRequest(db: Database, capi: CAPI, req: WasmRequest): unknown {
  const bind = req.params ?? [];
  switch (req.method) {
    case 'exec':
      db.exec(req.sql);
      return undefined;
    case 'run': {
      db.exec(req.sql, { bind });
      const result: SqlRunResult = {
        changes: db.changes(),
        lastInsertRowid: db.pointer === undefined ? 0 : Number(capi.sqlite3_last_insert_rowid(db.pointer)),
      };
      return result;
    }
    case 'all':
      return db.exec(req.sql, { bind, rowMode: 'object', returnValue: 'resultRows' }) ?? [];
    case 'get': {
      const rows = db.exec(req.sql, { bind, rowMode: 'object', returnValue: 'resultRows' });
      return rows && rows.length > 0 ? rows[0] : undefined;
    }
    default:
      throw new Error(`Unknown wasm SQL method: ${String(req.method)}`);
  }
}
