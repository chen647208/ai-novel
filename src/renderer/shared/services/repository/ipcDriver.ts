/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { ElectronAPI } from '../../../../shared/types';
import type { SqlDriver, SqlValue, SqlRunResult } from './types';

type DbBridge = NonNullable<ElectronAPI['db']>;

/**
 * 桌面 SqlDriver —— 把 SQL 操作经 electronAPI.db 转发到主进程的 node:sqlite。
 *
 * 序列化：单连接、单渲染线程。顶层操作(all/get/run/exec)通过 promise 链互斥串行；
 * transaction 在整个 BEGIN…COMMIT 期间持有该锁，并把一个“直连、不再排队”的子驱动交给回调，
 * 从而既避免自死锁，又保证事务语句之间不会被其它顶层操作插入。
 */
export class IpcSqlDriver implements SqlDriver {
  private readonly api: DbBridge;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(api: DbBridge) {
    this.api = api;
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
    return this.enqueue(() => this.api.exec(sql));
  }

  run(sql: string, params: SqlValue[] = []): Promise<SqlRunResult> {
    return this.enqueue(() => this.api.run(sql, params));
  }

  all<T = Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.enqueue(async () => (await this.api.all(sql, params)) as unknown as T[]);
  }

  get<T = Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): Promise<T | undefined> {
    return this.enqueue(async () => (await this.api.get(sql, params)) as unknown as T | undefined);
  }

  transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      // 事务内的直连子驱动：绕过队列（外层已持锁），避免自死锁。
      const direct: SqlDriver = {
        exec: (sql) => this.api.exec(sql),
        run: (sql, p = []) => this.api.run(sql, p),
        all: async <R>(sql: string, p: SqlValue[] = []) => (await this.api.all(sql, p)) as unknown as R[],
        get: async <R>(sql: string, p: SqlValue[] = []) => (await this.api.get(sql, p)) as unknown as R | undefined,
        // SQLite 不支持嵌套 BEGIN：内层事务直接内联执行。
        transaction: (inner) => inner(direct),
        close: () => Promise.resolve(),
      };
      await this.api.exec('BEGIN');
      try {
        const result = await fn(direct);
        await this.api.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          await this.api.exec('ROLLBACK');
        } catch { /* 回滚失败不覆盖原始错误 */ }
        throw error;
      }
    });
  }

  close(): Promise<void> {
    // 连接由主进程持有并在退出时关闭，这里无需处理。
    return Promise.resolve();
  }
}
