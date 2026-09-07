/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database, CAPI } from '@sqlite.org/sqlite-wasm';
// 显式以 ?url 引入 wasm 资源：vite 在 dev 下按原始资源正确返回字节、在 build 下产出带哈希的资产 URL。
// 若依赖 emscripten 默认的相对路径解析，dev 服务器会把该请求当作 SPA 回退返回 index.html（HTML 字节），
// 导致 WebAssembly.instantiate 报 "expected magic word 00 61 73 6d"。
import wasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url';
import { runWasmRequest, type WasmRequest } from './wasmSql';

/**
 * 网页端 SQLite worker —— 在专用线程内用官方 @sqlite.org/sqlite-wasm +
 * OPFS SAHPool VFS 打开单文件数据库，逐条执行主线程转发来的 SQL 请求。
 *
 * 为什么放 worker：OPFS 的同步访问句柄(createSyncAccessHandle)只能在专用 worker 使用；
 * SAHPool 通过 Web Locks 协调，无需 SharedArrayBuffer / COOP·COEP，部署门槛低。
 *
 * 序列化：主线程驱动保证同一时刻只有一个在途请求（发下一条前必等上一条回执），
 * 且 oo1 执行是同步的，故 worker 内 BEGIN…COMMIT 不会被其它语句插入。
 */
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<IncomingMessage>) => void) | null;
  postMessage: (message: unknown) => void;
};

const DB_FILE = '/ainovel.db';
// OPFS 目录名必须是合法的单段名称：不能带路径分隔符或 "." 前缀（否则 getDirectoryHandle 报 "Name is not allowed"）。
const POOL_DIR = 'ainovel-opfs';

let ready: Promise<{ db: Database; capi: CAPI }> | null = null;

async function ensureDb(): Promise<{ db: Database; capi: CAPI }> {
  // 官方 init 的类型标注为 0 参，但运行时接受 emscripten 配置对象（用于静音启动日志）。
  const initModule = sqlite3InitModule as unknown as (
    config?: Record<string, unknown>
  ) => ReturnType<typeof sqlite3InitModule>;
  const sqlite3 = await initModule({
    print: () => {},
    printErr: () => {},
    locateFile: (path: string) => (path.endsWith('.wasm') ? wasmUrl : path),
  });
  const pool = await sqlite3.installOpfsSAHPoolVfs({
    name: 'opfs-sahpool',
    directory: POOL_DIR,
    initialCapacity: 6,
  });
  const db = new pool.OpfsSAHPoolDb(DB_FILE);
  db.exec('PRAGMA foreign_keys = ON');
  return { db, capi: sqlite3.capi };
}

interface IncomingMessage {
  id: number;
  req: WasmRequest;
}

ctx.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const { id, req } = event.data;
  try {
    ready ??= ensureDb();
    const { db, capi } = await ready;
    const result = runWasmRequest(db, capi, req);
    ctx.postMessage({ id, ok: true, result });
  } catch (error) {
    ctx.postMessage({ id, ok: false, error: String((error as { message?: string })?.message ?? error) });
  }
};
