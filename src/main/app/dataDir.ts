/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 数据目录单源（标识更名 hongyue 全套）：新目录名、旧目录名、DB 文件名、
 * 环境变量覆盖键，以及老目录一次性迁移（旧目录改名 .legacy 保留，禁静默丢失）。
 *
 * 新目录由 Electron 按 appId 自动解析（app.getPath('userData')），此处只算旧目录
 * （独立 MCP server 不经过 Electron，也共用本模块）。
 */

import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { logger } from '../logger.js';

/** 当前数据目录名（改值只改一处；Electron 按 appId 自动落到此名）。 */
export const APP_DATA_DIR_NAME = 'hongyue-creation';

/** 更名前的旧目录名（只用于一次性迁移判定，迁移完成后不再引用）。 */
export const LEGACY_APP_DATA_DIR_NAME = 'novalocal-ai-novelist';

/** 当前 DB 文件名。 */
export const DB_FILE_NAME = 'hongyue.db';

/** 更名前的旧 DB 文件名（迁移时随目录内文件一并改名）。 */
export const LEGACY_DB_FILE_NAME = 'ainovel.db';

/** 数据目录环境变量覆盖键（独立 MCP server 与调试用）。 */
export const DATA_DIR_ENV = 'HONGYUE_DATA_DIR';

/** 按平台算旧数据目录（与更名前逻辑一致；新目录走 app.getPath 不经此处）。 */
export function legacyDataDir(): string {
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', LEGACY_APP_DATA_DIR_NAME);
    case 'win32':
      return path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), LEGACY_APP_DATA_DIR_NAME);
    default:
      return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), LEGACY_APP_DATA_DIR_NAME);
  }
}

/** 标准新数据目录（与旧目录同父目录；安装版 Electron userData 即此路径）。 */
export function standardDataDir(): string {
  return path.join(path.dirname(legacyDataDir()), APP_DATA_DIR_NAME);
}

/** 环境变量覆盖（新键优先；旧键已废弃，不再读取）。 */
export function dataDirOverride(): string | undefined {
  const v = process.env[DATA_DIR_ENV];
  return v && v.trim() ? v : undefined;
}

function exists(p: string): boolean {
  try {
    fsSync.statSync(p);
    return true;
  } catch {
    return false;
  }
}

/** 迁移守卫纯函数：仅标准路径跑迁移，隔离目录（E2E/调试）一律跳过。 */
export function shouldRunMigration(userDataDir: string, standardDir: string): boolean {
  const a = path.resolve(userDataDir);
  const b = path.resolve(standardDir);
  return process.platform === 'win32'
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

/** 迁移判定纯函数：旧目录存在且新目录不存在才搬（其余一律跳过）。 */
export function shouldMigrate(oldExists: boolean, newExists: boolean): boolean {
  return oldExists && !newExists;
}

/** 找一个不撞名的 .legacy 备份名（已存在则追加序号，绝不覆盖旧备份）。 */
export function backupName(oldDir: string): string {
  if (!exists(`${oldDir}.legacy`)) return `${oldDir}.legacy`;
  for (let n = 2; ; n += 1) {
    const candidate = `${oldDir}.legacy.${n}`;
    if (!exists(candidate)) return candidate;
  }
}

/**
 * 一次性迁移（同步实现：stdio 独立 server 也是同步入口）。
 * 旧目录整体复制到新目录 → 新目录内旧 DB 文件改名 → 旧目录改名 .legacy 保留。
 * 任一步失败即抛错（调用方记日志，不挡启动，下次启动重试）。
 */
export function migrateLegacyDataDirSync(oldDir: string, newDir: string): 'migrated' | 'skipped' {
  if (!shouldMigrate(exists(oldDir), exists(newDir))) return 'skipped';
  // 先整体复制到暂存目录，改名 DB 后再原子改名为新目录；
  // 中途失败只清理暂存、旧目录原样保留，下次启动可重试（避免"新目录半份数据"被误判已迁移）。
  const staging = `${newDir}.migrating-${process.pid}`;
  try {
    fsSync.cpSync(oldDir, staging, { recursive: true });
    const oldDb = path.join(staging, LEGACY_DB_FILE_NAME);
    const newDb = path.join(staging, DB_FILE_NAME);
    if (exists(oldDb) && !exists(newDb)) {
      fsSync.renameSync(oldDb, newDb);
    }
    fsSync.renameSync(staging, newDir);
  } catch (error) {
    try {
      fsSync.rmSync(staging, { recursive: true, force: true });
    } catch {
      /* 清理失败不影响重试 */
    }
    throw error;
  }
  fsSync.renameSync(oldDir, backupName(oldDir));
  logger.info('datadir', `数据目录已迁移，旧目录保留：${oldDir} → ${newDir}`);
  return 'migrated';
}

/** 同步实现的异步薄包（Electron 启动链共用）。 */
export async function migrateLegacyDataDir(oldDir: string, newDir: string): Promise<'migrated' | 'skipped'> {
  return migrateLegacyDataDirSync(oldDir, newDir);
}
