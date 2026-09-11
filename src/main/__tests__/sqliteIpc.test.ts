/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { beforeEach,describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  quickCheckValue: 'ok' as string | undefined,
  throwOnGet: false,
  execs: [] as string[],
}));

vi.mock('electron', () => ({
  app: { getPath: () => 'C:/tmp/userData' },
  ipcMain: { handle: vi.fn() },
}));

vi.mock('node:sqlite', () => ({
  DatabaseSync: class {
    exec(sql: string): void {
      store.execs.push(sql);
    }
    prepare(): { get: () => unknown } {
      return {
        get: () => {
          if (store.throwOnGet) throw new Error('boom');
          return store.quickCheckValue === undefined ? undefined : { quick_check: store.quickCheckValue };
        },
      };
    }
  },
}));

import { checkIntegrity, runMaintenance } from '../sqlite-ipc.js';

describe('sqlite 完整性检查与维护', () => {
  beforeEach(() => {
    store.quickCheckValue = 'ok';
    store.throwOnGet = false;
    store.execs = [];
  });

  it('quick_check 返回 ok', () => {
    expect(checkIntegrity()).toEqual({ ok: true, result: 'ok' });
  });

  it('quick_check 返回异常文本时判为损坏', () => {
    store.quickCheckValue = 'database disk image is malformed';
    expect(checkIntegrity()).toEqual({ ok: false, result: 'database disk image is malformed' });
  });

  it('查询抛错时返回错误信息', () => {
    store.throwOnGet = true;
    const r = checkIntegrity();
    expect(r.ok).toBe(false);
    expect(r.result).toContain('boom');
  });

  it('维护执行 VACUUM 与 REINDEX', () => {
    runMaintenance();
    expect(store.execs).toContain('VACUUM');
    expect(store.execs).toContain('REINDEX');
  });
});
