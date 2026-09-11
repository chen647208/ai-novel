/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * SQLite 数据引擎 IPC —— 在主进程托管 node:sqlite（Electron 44 内置 Node 24，无需实验开关）。
 *
 * 渲染层（沙箱、contextIsolation）拿不到 Node，只能经这四个语义化通道执行 SQL。
 * 信任模型：语句均来自应用自身编译代码（repository/schema），值一律走 params 绑定，
 * 渲染层不接收任何用户可控的 SQL 文本；与既有文件 IPC 同级信任。
 */
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { app, ipcMain } from 'electron';

import { DB_FILE_NAME } from './app/dataDir.js';
import { IPC } from './channels.js';
import { logger } from './logger.js';

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  const dbPath = path.join(app.getPath('userData'), DB_FILE_NAME);
  db = new DatabaseSync(dbPath);
  // WAL：并发读写更稳、崩溃可恢复；synchronous=NORMAL 在本地单用户场景兼顾安全与速度
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA foreign_keys = ON');
  logger.info('db', `SQLite 打开: ${dbPath}`);
  return db;
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid ${label}: expected string`);
  }
}

function assertParams(value: unknown): SQLInputValue[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new TypeError('Invalid params: expected array');
  }
  for (const p of value) {
    const ok =
      p === null ||
      typeof p === 'string' ||
      typeof p === 'number' ||
      typeof p === 'bigint' ||
      ArrayBuffer.isView(p);
    if (!ok) {
      throw new TypeError('Invalid param: expected null | string | number | bigint | ArrayBufferView');
    }
  }
  return value as SQLInputValue[];
}

export function registerSqliteIpc(): void {
  ipcMain.handle(IPC.db.exec, (_event, sql: string) => {
    assertString(sql, 'sql');
    getDb().exec(sql);
  });

  ipcMain.handle(IPC.db.run, (_event, sql: string, params: unknown[]) => {
    assertString(sql, 'sql');
    const r = getDb().prepare(sql).run(...assertParams(params));
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  });

  ipcMain.handle(IPC.db.all, (_event, sql: string, params: unknown[]) => {
    assertString(sql, 'sql');
    return getDb().prepare(sql).all(...assertParams(params));
  });

  ipcMain.handle(IPC.db.get, (_event, sql: string, params: unknown[]) => {
    assertString(sql, 'sql');
    return getDb().prepare(sql).get(...assertParams(params));
  });

  ipcMain.handle(IPC.db.integrityCheck, () => checkIntegrity());
  ipcMain.handle(IPC.db.maintenance, () => runMaintenance());
}

/** 快速完整性检查：返回 quick_check 结果（正常为 "ok"）。 */
export function checkIntegrity(): { ok: boolean; result: string } {
  try {
    const row = getDb().prepare('PRAGMA quick_check').get() as Record<string, unknown> | undefined;
    const result = row ? String(Object.values(row)[0] ?? '') : '';
    return { ok: result.toLowerCase() === 'ok', result: result || 'unknown' };
  } catch (error) {
    logger.warn('db', '完整性检查失败', error);
    return { ok: false, result: error instanceof Error ? error.message : String(error) };
  }
}

/** 维护：VACUUM 压缩 + REINDEX 重建索引。 */
export function runMaintenance(): void {
  const connection = getDb();
  connection.exec('VACUUM');
  connection.exec('REINDEX');
}

/** 应用退出前关闭连接（best-effort）。 */
export function closeSqlite(): void {
  if (db) {
    try {
      db.close();
    } catch (error) {
      logger.warn('db', '关闭 SQLite 连接失败', error);
    }
    db = null;
  }
}
