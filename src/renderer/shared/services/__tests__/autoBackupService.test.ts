/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 自动备份服务：用内存版 electronAPI 模拟文件系统，验证
 * 间隔判定、落盘、历史排序与读回（损坏文件跳过）。
 */
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import type { AppState, StorageConfig } from '../../../../shared/types';
import { autoBackupService } from '../autoBackupService';

const files = new Map<string, string>();

const api = {
  getAppDataPath: async () => '/appdata',
  exists: async (p: string) => files.has(p) || [...files.keys()].some((f) => f.startsWith(`${p}/`)),
  writeFile: async (p: string, data: string) => { files.set(p, data); return true; },
  unlink: async (p: string) => { files.delete(p); return true; },
  readFile: async (p: string) => {
    const v = files.get(p);
    if (v === undefined) throw new Error(`ENOENT ${p}`);
    return v;
  },
  listDirectory: async (dir: string) => [...files.keys()]
    .filter((f) => f.startsWith(`${dir}/`))
    .map((f) => ({ name: f.slice(dir.length + 1), type: 'file' as const })),
};

const config = (over: Partial<StorageConfig> = {}): StorageConfig =>
  ({ dataPath: '/appdata', useCustomPath: false, autoBackupEnabled: true, autoBackupInterval: 30, maxBackupFiles: 5, ...over });

const state = (): AppState => ({ schemaVersion: 1, projects: [], activeProjectId: null } as unknown as AppState);

describe('AutoBackupService', () => {
  beforeEach(() => {
    files.clear();
    (globalThis as { window?: unknown }).window = { electronAPI: api };
  });
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('shouldPerformBackup 按间隔判定', () => {
    expect(autoBackupService.shouldPerformBackup(config({ lastAutoBackup: Date.now() }))).toBe(false);
    expect(autoBackupService.shouldPerformBackup(config({ lastAutoBackup: Date.now() - 60_000 }))).toBe(true);
    expect(autoBackupService.shouldPerformBackup(config({ autoBackupEnabled: false }))).toBe(false);
  });

  it('performBackup 落盘 JSON 快照并回写时间', async () => {
    const cfg = config({ lastAutoBackup: 0 });
    const ok = await autoBackupService.performBackup(cfg, () => state());
    expect(ok).toBe(true);
    const names = [...files.keys()].filter((f) => f.startsWith('/appdata/backups/novalist-backup-'));
    expect(names).toHaveLength(1);
    expect(JSON.parse(files.get(names[0]!)!)).toMatchObject({ schemaVersion: 1 });
    expect(cfg.lastAutoBackup).toBeGreaterThan(0);
  });

  it('getBackupHistory 按时间倒序返回', async () => {
    files.set('/appdata/backups/novalist-backup-2026-01-01T00-00-00-000Z.json', '{"schemaVersion":1}');
    files.set('/appdata/backups/novalist-backup-2026-06-01T00-00-00-000Z.json', '{"schemaVersion":1}');
    const history = await autoBackupService.getBackupHistory(config());
    expect(history.map((h) => h.fileName)).toEqual([
      'novalist-backup-2026-06-01T00-00-00-000Z.json',
      'novalist-backup-2026-01-01T00-00-00-000Z.json',
    ]);
  });

  it('readBackup 解析有效文件，损坏返回 null', async () => {
    files.set('/appdata/backups/good.json', JSON.stringify({ schemaVersion: 1, projects: [] }));
    files.set('/appdata/backups/bad.json', '{ not json');
    expect(await autoBackupService.readBackup('/appdata/backups/good.json')).toMatchObject({ projects: [] });
    expect(await autoBackupService.readBackup('/appdata/backups/bad.json')).toBeNull();
  });
});
