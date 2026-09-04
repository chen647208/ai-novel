/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import type {
  AppState,
  Project,
  StorageConfig,
  ConsistencyCheckConfig,
  ConsistencyCheckPromptTemplate,
} from '../../../../shared/types';
import type { StorageRepository, SqlDriver, SqlValue, SearchHit, SearchOptions } from './types';
import { migrate, SETTING_KEYS, META_KEYS } from './schema';
import { jsonRepository } from './jsonRepository';
import { logger } from '../../utils/logger';

const DEFAULT_SEARCH_LIMIT = 50;
/** trigram 分词器需要至少 3 个字符才能命中 */
const MIN_TRIGRAM_QUERY = 3;

/** 把用户查询安全地包成 FTS5 短语（双引号包裹，内部双引号翻倍），避免查询语法注入 */
function toFtsPhrase(query: string): string {
  return `"${query.replace(/"/g, '""')}"`;
}

/**
 * SQLite 后端 —— 只依赖 SqlDriver 抽象，桌面(node:sqlite)与网页(wa-sqlite)共用。
 *
 * 数据模型：整棵 Project 存 projects.data(JSON)，非项目配置切片存 settings/meta，
 * 章节正文与知识库内容镜像进 FTS5(trigram) 供中文全文检索。
 * 增量写：saveProject 只 upsert 一行并重建该项目的 FTS；deleteProject 只删该项目。
 *
 * 与引擎无关的“文件传输”(导出/导入对话框)与“存储子系统配置”委托给 jsonRepository，
 * 因为它们本质是 JSON 文件搬运 / 独立配置文件，不属于数据引擎。
 */
export class SqliteRepository implements StorageRepository {
  private readonly driver: SqlDriver;
  private readonly ready: Promise<void>;
  private migrated = false;

  constructor(driver: SqlDriver) {
    this.driver = driver;
    this.ready = migrate(driver);
  }

  /**
   * 首启迁移：建表后若 SQLite 为空而旧 JSON/localStorage 有数据，则整体灌入一次
   * （此后 SQLite 成为唯一真相源）。用 meta 里的 `migrated_from_json` 哨兵保证“只迁移一次”：
   * 该哨兵刻意不被 clear()（恢复出厂）删除，因此即便之后清空数据表，重启也不会把旧数据复活。
   */
  async init(): Promise<void> {
    await this.ready;
    if (this.migrated) return;
    this.migrated = true;
    const sentinel = await this.driver.get<{ value: string }>(
      `SELECT value FROM meta WHERE key = 'migrated_from_json'`
    );
    if (sentinel) return; // 已完成过首启检查，永不再导入
    const existing = await this.loadAll();
    if (!existing) {
      const legacy = await jsonRepository.loadAll();
      if (legacy && (legacy.projects.length > 0 || legacy.models.length > 0)) {
        await this.saveAll(legacy);
        logger.info('[repository] 已从旧 JSON 存储迁移到 SQLite');
      }
    }
    await this.driver.run(
      `INSERT INTO meta(key, value) VALUES('migrated_from_json', '1')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      []
    );
  }

  // ========== 读取 ==========

  async loadAll(): Promise<AppState | null> {
    await this.ready;
    const projRows = await this.driver.all<{ id: string; data: string }>(
      `SELECT id, data FROM projects ORDER BY last_modified DESC`
    );
    const settingRows = await this.driver.all<{ key: string; value: string }>(
      `SELECT key, value FROM settings`
    );
    const metaRows = await this.driver.all<{ key: string; value: string }>(
      `SELECT key, value FROM meta`
    );
    // 空库（无项目、无配置）→ 返回 null，让上层回退到初始状态
    if (projRows.length === 0 && settingRows.length === 0) return null;

    const settings = new Map(settingRows.map((r) => [r.key, r.value]));
    const meta = new Map(metaRows.map((r) => [r.key, r.value]));
    const parse = <T>(k: string): T | undefined => {
      const v = settings.get(k);
      return v === undefined ? undefined : (JSON.parse(v) as T);
    };

    const state: AppState = {
      projects: projRows.map((r) => JSON.parse(r.data) as Project),
      activeProjectId: meta.get('activeProjectId') ?? null,
      models: parse('models') ?? [],
      prompts: parse('prompts') ?? [],
      activeModelId: meta.get('activeModelId') ?? null,
      embeddingModels: parse('embeddingModels') ?? [],
      activeEmbeddingModelId: meta.get('activeEmbeddingModelId') ?? null,
    };
    const cardPrompts = parse<AppState['cardPrompts']>('cardPrompts');
    if (cardPrompts) state.cardPrompts = cardPrompts;
    const consistencyPrompts = parse<ConsistencyCheckPromptTemplate[]>('consistencyPrompts');
    if (consistencyPrompts) state.consistencyPrompts = consistencyPrompts;
    const consistencyCheckConfig = parse<ConsistencyCheckConfig>('consistencyCheckConfig');
    if (consistencyCheckConfig) state.consistencyCheckConfig = consistencyCheckConfig;
    const lang = meta.get('language');
    if (lang === 'zh' || lang === 'en') state.language = lang;
    const theme = meta.get('theme');
    if (theme === 'light' || theme === 'dark' || theme === 'system') state.theme = theme;
    return state;
  }

  /** SQLite 为异步引擎，无同步读；返回 null（上层应改用 loadAll）。 */
  loadAllSync(): AppState | null {
    return null;
  }

  async loadConsistencyCheckConfig(): Promise<ConsistencyCheckConfig | null> {
    await this.ready;
    const row = await this.driver.get<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'consistencyCheckConfig'`
    );
    return row ? (JSON.parse(row.value) as ConsistencyCheckConfig) : null;
  }

  async loadConsistencyPrompts(): Promise<ConsistencyCheckPromptTemplate[] | null> {
    await this.ready;
    const row = await this.driver.get<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'consistencyPrompts'`
    );
    return row ? (JSON.parse(row.value) as ConsistencyCheckPromptTemplate[]) : null;
  }

  // ========== 写入 ==========

  async saveAll(state: AppState): Promise<void> {
    await this.ready;
    await this.driver.transaction(async (tx) => {
      for (const project of state.projects) {
        await this.upsertProjectTx(tx, project);
      }
      const keepIds = state.projects.map((p) => p.id);
      if (keepIds.length > 0) {
        const ph = keepIds.map(() => '?').join(',');
        await tx.run(`DELETE FROM projects WHERE id NOT IN (${ph})`, keepIds);
        await tx.run(`DELETE FROM chapters_fts WHERE project_id NOT IN (${ph})`, keepIds);
        await tx.run(`DELETE FROM knowledge_fts WHERE project_id NOT IN (${ph})`, keepIds);
      } else {
        await tx.run(`DELETE FROM projects`, []);
        await tx.run(`DELETE FROM chapters_fts`, []);
        await tx.run(`DELETE FROM knowledge_fts`, []);
      }
      await this.writeSettingsTx(tx, state);
      await this.writeMetaTx(tx, state);
    });
  }

  async saveProject(project: Project): Promise<void> {
    await this.ready;
    await this.driver.transaction(async (tx) => {
      await this.upsertProjectTx(tx, project);
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.ready;
    await this.driver.transaction(async (tx) => {
      await tx.run(`DELETE FROM projects WHERE id = ?`, [id]);
      await tx.run(`DELETE FROM chapters_fts WHERE project_id = ?`, [id]);
      await tx.run(`DELETE FROM knowledge_fts WHERE project_id = ?`, [id]);
      const active = await tx.get<{ value: string }>(`SELECT value FROM meta WHERE key = 'activeProjectId'`);
      if (active && active.value === id) {
        await tx.run(`DELETE FROM meta WHERE key = 'activeProjectId'`);
      }
    });
  }

  async saveSettings(patch: Partial<AppState>): Promise<void> {
    await this.ready;
    await this.driver.transaction(async (tx) => {
      await this.writeSettingsTx(tx, patch, true);
      await this.writeMetaTx(tx, patch, true);
    });
  }

  async clear(): Promise<void> {
    await this.ready;
    await this.driver.transaction(async (tx) => {
      await tx.run(`DELETE FROM projects`, []);
      await tx.run(`DELETE FROM settings`, []);
      await tx.run(`DELETE FROM chapters_fts`, []);
      await tx.run(`DELETE FROM knowledge_fts`, []);
      await tx.run(
        `DELETE FROM meta WHERE key IN ('activeProjectId','activeModelId','activeEmbeddingModelId','language','theme')`,
        []
      );
    });
  }

  // ========== 检索 ==========

  async search(query: string, options?: SearchOptions): Promise<SearchHit[]> {
    await this.ready;
    const q = query.trim();
    if (q.length < MIN_TRIGRAM_QUERY) return [];
    const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT;
    const match = toFtsPhrase(q);
    const projFilter = options?.projectId ? `AND project_id = ?` : '';
    const baseParams: SqlValue[] = options?.projectId ? [match, options.projectId] : [match];

    const chRows = await this.driver.all<{
      project_id: string; chapter_id: string; title: string; snip: string; rank: number;
    }>(
      `SELECT project_id, chapter_id, title,
              snippet(chapters_fts, 3, '[', ']', '…', 16) AS snip, rank
         FROM chapters_fts
        WHERE chapters_fts MATCH ? ${projFilter}
        ORDER BY rank LIMIT ?`,
      [...baseParams, limit]
    );
    const knRows = await this.driver.all<{
      project_id: string; item_id: string; category: string; name: string; snip: string; rank: number;
    }>(
      `SELECT project_id, item_id, category, name,
              snippet(knowledge_fts, 4, '[', ']', '…', 16) AS snip, rank
         FROM knowledge_fts
        WHERE knowledge_fts MATCH ? ${projFilter}
        ORDER BY rank LIMIT ?`,
      [...baseParams, limit]
    );

    const hits: SearchHit[] = [
      ...chRows.map((r) => ({ scope: 'chapter' as const, projectId: r.project_id, id: r.chapter_id, title: r.title, snippet: r.snip, rank: Number(r.rank) })),
      ...knRows.map((r) => ({ scope: 'knowledge' as const, projectId: r.project_id, id: r.item_id, title: r.name, category: r.category, snippet: r.snip, rank: Number(r.rank) })),
    ];
    hits.sort((a, b) => a.rank - b.rank);
    return hits.slice(0, limit);
  }

  // ========== 引擎无关：文件传输 / 存储配置（委托 JSON 后端） ==========

  exportAll(state: AppState): Promise<void> { return jsonRepository.exportAll(state); }
  importAll(): Promise<AppState> { return jsonRepository.importAll(); }
  exportBook(project: Project): Promise<void> { return jsonRepository.exportBook(project); }
  importBook(): Promise<Project> { return jsonRepository.importBook(); }
  getStorageConfig(): Promise<StorageConfig> { return jsonRepository.getStorageConfig(); }
  updateStorageConfig(config: StorageConfig): Promise<boolean> { return jsonRepository.updateStorageConfig(config); }

  // ========== 内部 ==========

  private async upsertProjectTx(tx: SqlDriver, project: Project): Promise<void> {
    await tx.run(
      `INSERT INTO projects(id, title, last_modified, data) VALUES(?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         last_modified = excluded.last_modified,
         data = excluded.data`,
      [project.id, project.title ?? '', project.lastModified ?? Date.now(), JSON.stringify(project)]
    );
    await this.refreshFtsTx(tx, project);
  }

  private async refreshFtsTx(tx: SqlDriver, project: Project): Promise<void> {
    await tx.run(`DELETE FROM chapters_fts WHERE project_id = ?`, [project.id]);
    for (const ch of project.chapters ?? []) {
      await tx.run(
        `INSERT INTO chapters_fts(project_id, chapter_id, title, content) VALUES(?, ?, ?, ?)`,
        [project.id, ch.id, ch.title ?? '', ch.content ?? '']
      );
    }
    await tx.run(`DELETE FROM knowledge_fts WHERE project_id = ?`, [project.id]);
    for (const item of project.knowledge ?? []) {
      await tx.run(
        `INSERT INTO knowledge_fts(project_id, item_id, category, name, content) VALUES(?, ?, ?, ?, ?)`,
        [project.id, item.id, item.category ?? '', item.name ?? '', item.content ?? '']
      );
    }
  }

  /**
   * 写非项目配置切片。onlyProvided=true 时仅写 patch 中出现的键（增量），
   * 否则按 state 全量对齐（缺失键删除该行）。
   */
  private async writeSettingsTx(tx: SqlDriver, source: Partial<AppState>, onlyProvided = false): Promise<void> {
    for (const key of SETTING_KEYS) {
      const present = key in source;
      if (onlyProvided && !present) continue;
      const val = (source as Record<string, unknown>)[key];
      if (val === undefined) {
        await tx.run(`DELETE FROM settings WHERE key = ?`, [key]);
      } else {
        await tx.run(
          `INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [key, JSON.stringify(val)]
        );
      }
    }
  }

  private async writeMetaTx(tx: SqlDriver, source: Partial<AppState>, onlyProvided = false): Promise<void> {
    for (const key of META_KEYS) {
      const present = key in source;
      if (onlyProvided && !present) continue;
      const val = (source as Record<string, unknown>)[key];
      if (val === null || val === undefined) {
        await tx.run(`DELETE FROM meta WHERE key = ?`, [key]);
      } else {
        await tx.run(
          `INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [key, String(val)]
        );
      }
    }
  }
}
