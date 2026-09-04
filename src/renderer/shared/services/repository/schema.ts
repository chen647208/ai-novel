/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import type { SqlDriver } from './types';

/**
 * 数据库 schema 与迁移。桌面(node:sqlite)与网页(@sqlite.org/sqlite-wasm)共用同一份，
 * 因此这里只写标准 SQLite DDL，不含任何环境相关代码。
 *
 * 采用“文档行 + FTS5”混合模型：
 *  - projects.data 存整棵 Project JSON（保留应用内存文档模型，增量写只动一行）
 *  - chapters_fts / knowledge_fts 用 trigram 分词，支持中文正文子串检索
 */

export const SCHEMA_VERSION = 1;

/** settings 表里以 JSON 存储的非项目配置切片键 */
export const SETTING_KEYS = [
  'models',
  'prompts',
  'cardPrompts',
  'consistencyPrompts',
  'consistencyCheckConfig',
  'embeddingModels',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

/** meta 表里以标量存储的键 */
export const META_KEYS = ['activeProjectId', 'activeModelId', 'activeEmbeddingModelId', 'language'] as const;
export type MetaKey = (typeof META_KEYS)[number];

/** 迁移脚本：version 为应用该脚本后达到的版本 */
export const MIGRATIONS: ReadonlyArray<{ version: number; up: readonly string[] }> = [
  {
    version: 1,
    up: [
      `CREATE TABLE IF NOT EXISTS meta (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS projects (
         id            TEXT PRIMARY KEY,
         title         TEXT NOT NULL,
         last_modified INTEGER NOT NULL,
         data          TEXT NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_projects_modified ON projects(last_modified)`,
      `CREATE TABLE IF NOT EXISTS settings (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
      `CREATE VIRTUAL TABLE IF NOT EXISTS chapters_fts USING fts5(
         project_id UNINDEXED,
         chapter_id UNINDEXED,
         title,
         content,
         tokenize = 'trigram'
       )`,
      `CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
         project_id UNINDEXED,
         item_id    UNINDEXED,
         category   UNINDEXED,
         name,
         content,
         tokenize = 'trigram'
       )`,
    ],
  },
];

/**
 * 将数据库迁移到最新 schema。幂等：已应用的版本会被跳过。
 * 每条迁移脚本在一个事务内执行，并写入 schema_version。
 */
export async function migrate(driver: SqlDriver): Promise<void> {
  // 引导 meta 表（首次运行时读取版本前必须存在）
  await driver.exec(
    `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
  );
  const row = await driver.get<{ value: string }>(
    `SELECT value FROM meta WHERE key = 'schema_version'`
  );
  const current = row ? Number(row.value) : 0;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await driver.transaction(async (tx) => {
      for (const sql of m.up) {
        await tx.exec(sql);
      }
      await tx.run(
        `INSERT INTO meta(key, value) VALUES('schema_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(m.version)]
      );
    });
  }
}
