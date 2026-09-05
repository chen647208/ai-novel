/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { SqlDriver, SqlValue, SqlRunResult } from './types';
import type { WasmRequest } from './wasmSql';

interface Reply {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

/**
 * 网页 SqlDriver —— 把 SQL 请求经 postMessage 转发到 OPFS worker（官方 sqlite-wasm）。
 *
 * 与桌面 IpcSqlDriver 同构：顶层操作通过 promise 链互斥串行；transaction 在整个
 * BEGIN…COMMIT 期间持锁，并把一个“直连、不再排队”的子驱动交给回调，避免自死锁，
 * 同时保证事务语句之间不会被其它顶层操作插入（主线程串行 → worker 单在途请求）。
 */
export class WasmSqliteDriver implements SqlDriver {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private tail: Promise<unknown> = Promise.resolve();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<Reply>) => {
      const { id, ok, result, error } = event.data;
      const entry = this.pending.get(id);
      if (!entry) return;
      this.pending.delete(id);
      if (ok) entry.resolve(result);
      else entry.reject(new Error(error ?? 'SQLite worker error'));
    };
    worker.onerror = (event) => {
      // worker 级错误：让所有在途请求失败，避免悬挂。
      const message = event.message || 'SQLite worker crashed';
      for (const entry of this.pending.values()) entry.reject(new Error(message));
      this.pending.clear();
    };
    this.worker = worker;
    return worker;
  }

  private request<T>(req: WasmRequest): Promise<T> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ id, req });
    });
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.tail.then(() => fn());
    this.tail = result.then(
      () => { /* keep chain alive */ },
      () => { /* swallow to avoid unhandled rejection on the chain */ }
    );
    return result;
  }

  exec(sql: string): Promise<void> {
    return this.enqueue(async () => { await this.request<void>({ method: 'exec', sql }); });
  }

  run(sql: string, params: SqlValue[] = []): Promise<SqlRunResult> {
    return this.enqueue(() => this.request<SqlRunResult>({ method: 'run', sql, params }));
  }

  all<T = Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.enqueue(() => this.request<T[]>({ method: 'all', sql, params }));
  }

  get<T = Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): Promise<T | undefined> {
    return this.enqueue(() => this.request<T | undefined>({ method: 'get', sql, params }));
  }

  transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      const direct: SqlDriver = {
        exec: (sql) => this.request<void>({ method: 'exec', sql }),
        run: (sql, p = []) => this.request<SqlRunResult>({ method: 'run', sql, params: p }),
        all: <R>(sql: string, p: SqlValue[] = []) => this.request<R[]>({ method: 'all', sql, params: p }),
        get: <R>(sql: string, p: SqlValue[] = []) => this.request<R | undefined>({ method: 'get', sql, params: p }),
        transaction: (inner) => inner(direct),
        close: () => Promise.resolve(),
      };
      await this.request<void>({ method: 'exec', sql: 'BEGIN' });
      try {
        const result = await fn(direct);
        await this.request<void>({ method: 'exec', sql: 'COMMIT' });
        return result;
      } catch (error) {
        try {
          await this.request<void>({ method: 'exec', sql: 'ROLLBACK' });
        } catch { /* 回滚失败不覆盖原始错误 */ }
        throw error;
      }
    });
  }

  close(): Promise<void> {
    this.worker?.terminate();
    this.worker = null;
    for (const entry of this.pending.values()) entry.reject(new Error('SQLite driver closed'));
    this.pending.clear();
    return Promise.resolve();
  }
}
