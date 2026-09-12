/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  quickCheckValue: 'ok' as string | undefined,
  throwOnGet: false,
  throwOnExec: false,
  throwOnPragma: false,
  encAvailable: true,
  backend: 'gnome_libsecret',
  userDataDir: '',
  execs: [] as string[],
  pragmas: [] as string[],
}));

vi.mock('electron', () => ({
  app: { getPath: () => store.userDataDir },
  ipcMain: { handle: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: () => store.encAvailable,
    getSelectedStorageBackend: () => store.backend,
    encryptString: (s: string) => Buffer.from(`enc:${s}`),
    decryptString: (b: Buffer) => b.toString().replace('enc:', ''),
  },
}));

vi.mock('better-sqlite3-multiple-ciphers', async () => {
  const nodeFs = await import('node:fs');
  return {
    default: class {
      exec(sql: string): void {
        store.execs.push(sql);
        if (store.throwOnExec) throw new Error('exec boom');
        const m = /^VACUUM INTO '(.+)'$/.exec(sql);
        if (m?.[1]) nodeFs.writeFileSync(m[1], Buffer.from('backup-bytes'));
      }
      pragma(sql: string): void {
        if (store.throwOnPragma) throw new Error('pragma boom');
        store.pragmas.push(sql);
      }
      close(): void {
        /* 无底层资源，空实现 */
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
  };
});

import { encryptionStatus } from '../dbKey.js';
import {
  applyDbRecoveryKey,
  checkIntegrity,
  dbBackupFileName,
  disableDbEncryption,
  enableDbEncryption,
  escapeSqlLiteral,
  exportDbRecoveryKey,
  fullIntegrityCheck,
  hotBackup,
  resolveDbBackupPath,
  runMaintenance,
} from '../sqlite-ipc.js';

describe('sqlite 完整性检查与维护', () => {
  beforeEach(() => {
    store.quickCheckValue = 'ok';
    store.throwOnGet = false;
    store.throwOnExec = false;
    store.throwOnPragma = false;
    store.encAvailable = true;
    store.backend = 'gnome_libsecret';
    store.userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hongyue-sqlite-'));
    store.execs = [];
  });

  afterEach(() => {
    fs.rmSync(store.userDataDir, { recursive: true, force: true });
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

  it('深度完整性检查返回 ok', () => {
    expect(fullIntegrityCheck()).toEqual({ ok: true, result: 'ok' });
  });

  it('热备份文件名可解析回时间戳', () => {
    const now = Date.UTC(2026, 0, 2, 3, 4, 5, 6);
    const name = dbBackupFileName(now);
    expect(name).toMatch(/^hongyue-db-2026-01-02T03-04-05-006Z\.db$/);
  });

  it('热备份落点在 userData/backups 下', () => {
    const p = resolveDbBackupPath('C:/data', 0);
    expect(p.replace(/\\/g, '/')).toBe('C:/data/backups/hongyue-db-1970-01-01T00-00-00-000Z.db');
  });

  it('SQL 字面量转义单引号', () => {
    expect(escapeSqlLiteral("a'b")).toBe("a''b");
  });

  it('热备份写入 userData/backups 并返回字节数', () => {
    const r = hotBackup();
    expect(r.ok).toBe(true);
    expect(r.bytes).toBeGreaterThan(0);
    expect(r.path && fs.existsSync(r.path)).toBe(true);
    expect(store.execs.some((s) => s.startsWith('VACUUM INTO '))).toBe(true);
  });

  it('热备份执行失败时返回错误而不抛', () => {
    store.throwOnExec = true;
    const r = hotBackup();
    expect(r.ok).toBe(false);
    expect(r.error).toContain('exec boom');
  });

  it('启用加密写入密钥文件并返回恢复码', () => {
    expect(encryptionStatus()).toMatchObject({ enabled: false, available: true, weakBackend: false });
    const r = enableDbEncryption();
    expect(r.ok).toBe(true);
    expect(r.recoveryCode).toMatch(/^[0-9a-f]{64}$/);
    expect(encryptionStatus().enabled).toBe(true);
    expect(store.pragmas.some((p) => p.startsWith('rekey='))).toBe(true);
    expect(enableDbEncryption().ok).toBe(false);
  });

  it('导出恢复码与停用加密', () => {
    const enabled = enableDbEncryption();
    const exported = exportDbRecoveryKey();
    expect(exported.ok).toBe(true);
    expect(exported.code).toBe(enabled.recoveryCode);
    expect(disableDbEncryption().ok).toBe(true);
    expect(encryptionStatus().enabled).toBe(false);
  });

  it('启用加密 rekey 失败回滚密钥文件', () => {
    store.throwOnPragma = true;
    const r = enableDbEncryption();
    expect(r.ok).toBe(false);
    expect(encryptionStatus().enabled).toBe(false);
  });

  it('钥匙串不可用时拒绝启用加密', () => {
    store.encAvailable = false;
    const r = enableDbEncryption();
    expect(r.ok).toBe(false);
    expect(encryptionStatus().enabled).toBe(false);
  });

  it('应用恢复码重建密钥文件', () => {
    const r = applyDbRecoveryKey('a'.repeat(64));
    expect(r.ok).toBe(true);
    expect(encryptionStatus().enabled).toBe(true);
  });
});
