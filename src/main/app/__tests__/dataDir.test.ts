/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import {
  backupName,
  DB_FILE_NAME,
  LEGACY_DB_FILE_NAME,
  legacyDataDir,
  migrateLegacyDataDir,
  shouldMigrate,
  shouldRunMigration,
} from '../dataDir.js';

describe('legacyDataDir 平台解析', () => {
  it('darwin / linux 分支', () => {
    const spy = vi.spyOn(process, 'platform', 'get');
    try {
      spy.mockReturnValue('darwin');
      expect(legacyDataDir()).toContain('Library');
      spy.mockReturnValue('linux');
      expect(legacyDataDir()).toContain('.config');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('shouldRunMigration', () => {
  it('仅标准路径跑，隔离目录跳过', () => {
    expect(shouldRunMigration('/a/hongyue-creation', '/a/hongyue-creation')).toBe(true);
    expect(shouldRunMigration('/tmp/xxx', '/a/hongyue-creation')).toBe(false);
  });
});

describe('shouldMigrate', () => {
  it('仅旧存在新不存在才搬', () => {
    expect(shouldMigrate(true, false)).toBe(true);
    expect(shouldMigrate(false, false)).toBe(false);
    expect(shouldMigrate(true, true)).toBe(false);
    expect(shouldMigrate(false, true)).toBe(false);
  });
});

describe('migrateLegacyDataDir（真实临时目录）', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'hongyue-migrate-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('复制旧目录→新目录，旧 DB 改名，旧目录改 .legacy 保留', async () => {
    const oldDir = path.join(root, 'novalocal-ai-novelist');
    const newDir = path.join(root, 'hongyue-creation');
    await fs.mkdir(path.join(oldDir, 'vectra_indices'), { recursive: true });
    await fs.writeFile(path.join(oldDir, LEGACY_DB_FILE_NAME), 'db-bytes');
    await fs.writeFile(path.join(oldDir, 'window-state.json'), '{}');

    expect(await migrateLegacyDataDir(oldDir, newDir)).toBe('migrated');
    // 新目录内容齐全且 DB 已改名
    expect(await fs.readFile(path.join(newDir, DB_FILE_NAME), 'utf-8')).toBe('db-bytes');
    expect(await fs.readFile(path.join(newDir, 'window-state.json'), 'utf-8')).toBe('{}');
    // 旧目录改名保留，原路径消失
    await expect(fs.stat(oldDir)).rejects.toThrow();
    expect(await fs.readFile(path.join(`${oldDir}.legacy`, LEGACY_DB_FILE_NAME), 'utf-8')).toBe('db-bytes');
    // 幂等：再跑一次跳过
    expect(await migrateLegacyDataDir(oldDir, newDir)).toBe('skipped');
  });

  it('新目录已存在则跳过（不覆盖用户新数据）', async () => {
    const oldDir = path.join(root, 'old');
    const newDir = path.join(root, 'new');
    await fs.mkdir(oldDir, { recursive: true });
    await fs.mkdir(newDir, { recursive: true });
    await fs.writeFile(path.join(newDir, 'keep.txt'), 'new');
    expect(await migrateLegacyDataDir(oldDir, newDir)).toBe('skipped');
    expect(await fs.readFile(path.join(newDir, 'keep.txt'), 'utf-8')).toBe('new');
    await expect(fs.stat(oldDir)).resolves.toBeDefined();
  });

  it('.legacy 已存在则追加序号，绝不覆盖旧备份', async () => {
    const oldDir = path.join(root, 'old');
    await fs.mkdir(oldDir, { recursive: true });
    await fs.mkdir(`${oldDir}.legacy`, { recursive: true });
    expect(backupName(oldDir)).toBe(`${oldDir}.legacy.2`);
  });

  it('复制失败时清理暂存、旧目录原样保留（可重试）', async () => {
    const oldDir = path.join(root, 'old');
    const newDir = path.join(root, 'new');
    await fs.mkdir(oldDir, { recursive: true });
    await fs.writeFile(path.join(oldDir, 'x.txt'), 'keep');
    // 用文件堵住暂存目录名，令整目录复制失败
    await fs.writeFile(`${newDir}.migrating-${process.pid}`, 'block');

    await expect(migrateLegacyDataDir(oldDir, newDir)).rejects.toThrow();
    expect(await fs.readFile(path.join(oldDir, 'x.txt'), 'utf-8')).toBe('keep');
    await expect(fs.stat(newDir)).rejects.toThrow();
  });
});
