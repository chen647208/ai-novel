/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { SqlDriver } from './types';

/**
 * 数据库 schema 与迁移（v2 六实体）。桌面(node:sqlite)与网页(@sqlite.org/sqlite-wasm)共用，
 * 只写标准 SQLite DDL，不含环境相关代码。
 *
 * v1→v2 换代（用户确认无生产数据，直接替换）：
 *  - 旧 projects.data 文档行模型 → nodes/edges/attrs 六实体表；
 *  - 新增 revisions/attachments/blobs/entity_changes；
 *  - chapters_fts/knowledge_fts 合并为 nodes_fts（投影自节点 title+body）。
 * 每个实体表带 hash 列：变更检测缓存，saveProject 时与旧行比对，仅真实变化才写 entity_changes。
 */

export const SCHEMA_VERSION = 2;

/** settings 表里以 JSON 存储的非项目配置切片键 */
export const SETTING_KEYS = [
  'models',
  'prompts',
  'cardPrompts',
  'consistencyPrompts',
  'consistencyCheckConfig',
  'embeddingModels',
  'customFonts',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

/** meta 表里以标量存储的键 */
export const META_KEYS = ['activeProjectId', 'activeModelId', 'activeEmbeddingModelId', 'language', 'theme', 'uiFont', 'editorFont'] as const;
export type MetaKey = (typeof META_KEYS)[number];

/** 迁移脚本：version 为应用该脚本后达到的版本 */
export const MIGRATIONS: ReadonlyArray<{ version: number; up: readonly string[] }> = [
  {
    version: 2,
    up: [
      // 丢弃 v1 文档行模型（无生产数据，直接换代）
      `DROP TABLE IF EXISTS chapters_fts`,
      `DROP TABLE IF EXISTS knowledge_fts`,
      `DROP TABLE IF EXISTS projects`,
      `CREATE TABLE IF NOT EXISTS nodes (
         id         TEXT PRIMARY KEY,
         book_id    TEXT NOT NULL,
         type       TEXT NOT NULL,
         title      TEXT NOT NULL,
         body       TEXT NOT NULL,
         path       TEXT,
         created_at INTEGER NOT NULL,
         updated_at INTEGER NOT NULL,
         erased     INTEGER NOT NULL DEFAULT 0,
         hash       TEXT NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_nodes_book ON nodes(book_id)`,
      `CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)`,
      `CREATE TABLE IF NOT EXISTS edges (
         id       TEXT PRIMARY KEY,
         from_id  TEXT NOT NULL,
         to_id    TEXT NOT NULL,
         kind     TEXT NOT NULL,
         role     TEXT,
         position REAL NOT NULL,
         book_id  TEXT NOT NULL,
         erased   INTEGER NOT NULL DEFAULT 0,
         hash     TEXT NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_edges_book ON edges(book_id)`,
      `CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id)`,
      `CREATE TABLE IF NOT EXISTS attrs (
         id          TEXT PRIMARY KEY,
         node_id     TEXT NOT NULL,
         type        TEXT NOT NULL,
         name        TEXT NOT NULL,
         value       TEXT NOT NULL,
         inheritable INTEGER NOT NULL DEFAULT 0,
         position    INTEGER NOT NULL,
         erased      INTEGER NOT NULL DEFAULT 0,
         hash        TEXT NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_attrs_node ON attrs(node_id)`,
      `CREATE TABLE IF NOT EXISTS revisions (
         id         TEXT PRIMARY KEY,
         node_id    TEXT NOT NULL,
         seq        INTEGER NOT NULL,
         body       TEXT NOT NULL,
         author     TEXT NOT NULL,
         cause      TEXT,
         created_at INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_revisions_node ON revisions(node_id, seq)`,
      `CREATE TABLE IF NOT EXISTS attachments (
         id      TEXT PRIMARY KEY,
         node_id TEXT NOT NULL,
         role    TEXT NOT NULL,
         mime    TEXT NOT NULL,
         blob_id TEXT NOT NULL,
         erased  INTEGER NOT NULL DEFAULT 0
       )`,
      `CREATE TABLE IF NOT EXISTS blobs (
         id    TEXT PRIMARY KEY,
         bytes BLOB NOT NULL,
         enc   TEXT
       )`,
      `CREATE TABLE IF NOT EXISTS entity_changes (
         id               INTEGER PRIMARY KEY AUTOINCREMENT,
         entity_name      TEXT NOT NULL,
         entity_id        TEXT NOT NULL,
         hash             TEXT NOT NULL,
         is_erased        INTEGER NOT NULL,
         instance_id      TEXT NOT NULL,
         agent_id         TEXT NOT NULL,
         utc_date_changed INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_changes_entity ON entity_changes(entity_name, entity_id)`,
      // 全文检索：投影自章节/知识节点（trigram 支持中文子串）
      `CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
         book_id UNINDEXED,
         node_id UNINDEXED,
         type    UNINDEXED,
         title,
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
  await driver.exec(
    `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
  );
  await driver.exec(
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
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
