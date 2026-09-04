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
import type { StorageRepository, SqlDriver, SqlValue, SearchHit, SearchOptions, CommitOptions } from './types';
import { migrate, SETTING_KEYS, META_KEYS } from './schema';
import { jsonRepository } from './jsonRepository';
import { logger } from '../../utils/logger';
import { projectToEntities, entitiesToProject } from '@core/project';
import { indexService } from '@core/index';
import {
  hashEntity,
  getInstanceId,
  uuidv7,
  type EntityChange,
  type BookEntities,
  type RevisionEntity,
  type NodeEntity,
  type EdgeEntity,
  type AttributeEntity,
} from '@core/entities';

const DEFAULT_SEARCH_LIMIT = 50;
/** trigram 分词器需要至少 3 个字符才能命中 */
const MIN_TRIGRAM_QUERY = 3;

/** 把用户查询安全地包成 FTS5 短语（双引号包裹，内部双引号翻倍），避免查询语法注入 */
function toFtsPhrase(query: string): string {
  return `"${query.replace(/"/g, '""')}"`;
}

/** 节点类型 → 检索 scope（与旧 chapters_fts/knowledge_fts 双域对齐） */
function scopeOf(type: string): 'chapter' | 'knowledge' | null {
  if (type === 'novel.chapter') return 'chapter';
  if (type === 'meta.knowledge') return 'knowledge';
  return null;
}

interface EntityRow {
  id: string;
  hash: string;
}

/**
 * SQLite 后端 —— 只依赖 SqlDriver 抽象，桌面(node:sqlite)与网页(wa-sqlite)共用。
 *
 * v2 数据模型：六实体表（nodes/edges/attrs）为存储真相，Project 文档模型经投影桥双向映射；
 * 每次 saveProject 在单事务内做“书级替换 + 哈希差分”，仅真实变化的实体写入 entity_changes，
 * 章节/知识节点镜像进 nodes_fts(trigram) 供中文全文检索。
 *
 * 与引擎无关的“文件传输”(导出/导入对话框)与“存储子系统配置”委托给 jsonRepository。
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
   * （此后 SQLite 成为唯一真相源）。用 meta 里的 `migrated_from_json` 哨兵保证“只迁移一次”。
   */
  async init(): Promise<void> {
    await this.ready;
    if (this.migrated) return;
    this.migrated = true;
    const sentinel = await this.driver.get<{ value: string }>(
      `SELECT value FROM meta WHERE key = 'migrated_from_json'`
    );
    if (sentinel) return;
    const existing = await this.loadAll();
    if (!existing) {
      const legacy = await jsonRepository.loadAll();
      if (legacy && (legacy.projects.length > 0 || legacy.models.length > 0)) {
        await this.saveAll(legacy);
        logger.info('[repository] 已从旧 JSON 存储迁移到 SQLite（v2 实体模型）');
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
    const nodeRows = await this.driver.all<NodeRow>(`SELECT * FROM nodes`);
    const settingRows = await this.driver.all<{ key: string; value: string }>(`SELECT key, value FROM settings`);
    const metaRows = await this.driver.all<{ key: string; value: string }>(`SELECT key, value FROM meta`);
    if (nodeRows.length === 0 && settingRows.length === 0) return null;

    // 按书分组投影回文档模型
    const byBook = new Map<string, { nodes: NodeEntity[]; edges: EdgeEntity[]; attrs: AttributeEntity[] }>();
    const ensure = (bookId: string) => {
      let g = byBook.get(bookId);
      if (!g) {
        g = { nodes: [], edges: [], attrs: [] };
        byBook.set(bookId, g);
      }
      return g;
    };
    for (const r of nodeRows) ensure(r.book_id).nodes.push(rowToNode(r));
    const edgeRows = await this.driver.all<EdgeRow>(`SELECT * FROM edges`);
    for (const r of edgeRows) ensure(r.book_id).edges.push(rowToEdge(r));
    const attrRows = await this.driver.all<AttrRow & { book_id: string }>(
      `SELECT a.*, n.book_id FROM attrs a JOIN nodes n ON a.node_id = n.id`
    );
    for (const r of attrRows) ensure(r.book_id).attrs.push(rowToAttr(r));

    const projects: Project[] = [];
    for (const [bookId, group] of byBook) {
      // 索引是实体的派生缓存：冷启动从已加载实体全量重建（指纹短路避免重复 loadAll 重算）
      indexService.rebuild(bookId, group);
      try {
        projects.push(entitiesToProject(group));
      } catch (error) {
        logger.error(`[repository] 书 ${bookId} 投影失败，已跳过`, error);
      }
    }
    projects.sort((a, b) => b.lastModified - a.lastModified);

    const settings = new Map(settingRows.map((r) => [r.key, r.value]));
    const meta = new Map(metaRows.map((r) => [r.key, r.value]));
    const parse = <T>(k: string): T | undefined => {
      const v = settings.get(k);
      return v === undefined ? undefined : (JSON.parse(v) as T);
    };

    const state: AppState = {
      projects,
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

  /** 读取某节点的正文修订历史（按 seq 升序） */
  async loadRevisions(nodeId: string): Promise<RevisionEntity[]> {
    await this.ready;
    const rows = await this.driver.all<RevisionRow>(
      `SELECT id, node_id, seq, body, author, cause, created_at FROM revisions WHERE node_id = ? ORDER BY seq ASC`,
      [nodeId]
    );
    return rows.map((r) => ({
      id: r.id,
      nodeId: r.node_id,
      seq: Number(r.seq),
      body: r.body,
      author: r.author,
      cause: r.cause ?? undefined,
      createdAt: Number(r.created_at),
    }));
  }

  // ========== 写入 ==========

  async saveAll(state: AppState): Promise<void> {
    await this.ready;
    const { synced, erased } = await this.driver.transaction(async (tx) => {
      const synced = new Map<string, BookEntities>();
      for (const project of state.projects) {
        synced.set(project.id, await this.syncBookTx(tx, project));
      }
      // 删除 state 中不存在的书
      const keepIds = state.projects.map((p) => p.id);
      const existingBooks = await tx.all<{ book_id: string }>(`SELECT DISTINCT book_id FROM nodes`);
      const erased: string[] = [];
      for (const row of existingBooks) {
        if (!keepIds.includes(row.book_id)) {
          await this.eraseBookTx(tx, row.book_id);
          erased.push(row.book_id);
        }
      }
      await this.writeSettingsTx(tx, state);
      await this.writeMetaTx(tx, state);
      return { synced, erased };
    });
    // 提交后统一刷新派生索引
    for (const [bookId, entities] of synced) indexService.rebuild(bookId, entities);
    for (const bookId of erased) indexService.invalidate(bookId);
  }

  async saveProject(project: Project, opts?: CommitOptions): Promise<void> {
    await this.ready;
    const entities = await this.driver.transaction(async (tx) => this.syncBookTx(tx, project, opts));
    // 事务提交成功后再刷新派生索引，避免回滚导致索引与库不一致
    indexService.rebuild(project.id, entities);
  }

  async deleteProject(id: string): Promise<void> {
    await this.ready;
    await this.driver.transaction(async (tx) => {
      await this.eraseBookTx(tx, id);
      const active = await tx.get<{ value: string }>(`SELECT value FROM meta WHERE key = 'activeProjectId'`);
      if (active && active.value === id) {
        await tx.run(`DELETE FROM meta WHERE key = 'activeProjectId'`);
      }
    });
    indexService.invalidate(id);
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
      await tx.run(`DELETE FROM nodes`, []);
      await tx.run(`DELETE FROM edges`, []);
      await tx.run(`DELETE FROM attrs`, []);
      await tx.run(`DELETE FROM revisions`, []);
      await tx.run(`DELETE FROM attachments`, []);
      await tx.run(`DELETE FROM blobs`, []);
      await tx.run(`DELETE FROM entity_changes`, []);
      await tx.run(`DELETE FROM nodes_fts`, []);
      await tx.run(`DELETE FROM settings`, []);
      await tx.run(
        `DELETE FROM meta WHERE key IN ('activeProjectId','activeModelId','activeEmbeddingModelId','language','theme')`,
        []
      );
    });
    indexService.clear();
  }

  // ========== 检索 ==========

  async search(query: string, options?: SearchOptions): Promise<SearchHit[]> {
    await this.ready;
    const q = query.trim();
    if (q.length < MIN_TRIGRAM_QUERY) return [];
    const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT;
    const match = toFtsPhrase(q);
    const projFilter = options?.projectId ? `AND book_id = ?` : '';
    const baseParams: SqlValue[] = options?.projectId ? [match, options.projectId] : [match];

    const rows = await this.driver.all<{
      book_id: string; node_id: string; type: string; title: string; snip: string; rank: number;
    }>(
      `SELECT book_id, node_id, type, title,
              snippet(nodes_fts, 4, '[', ']', '…', 16) AS snip, rank
         FROM nodes_fts
        WHERE nodes_fts MATCH ? ${projFilter}
        ORDER BY rank LIMIT ?`,
      [...baseParams, limit]
    );

    const hits: SearchHit[] = [];
    for (const r of rows) {
      const scope = scopeOf(r.type);
      if (!scope) continue;
      hits.push({
        scope,
        projectId: r.book_id,
        id: r.node_id,
        title: r.title,
        snippet: r.snip,
        rank: Number(r.rank),
      });
    }
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

  // ========== 内部：书级实体同步 ==========

  /**
   * 在事务内把一本书的实体全量替换为 project 的投影，并对哈希变化的实体写 entity_changes。
   * 删除旧行 → 插入新行（带 hash）→ 差分变更日志 → 刷新 FTS 投影。
   */
  private async syncBookTx(tx: SqlDriver, project: Project, opts?: CommitOptions): Promise<BookEntities> {
    const bookId = project.id;
    const entities = projectToEntities(project);
    const agentId = opts?.agentId ?? 'user';
    const cause = opts?.cause ?? null;

    // 旧哈希（差分基线）+ 旧正文（Revision 触发判定）
    const oldNodes = await tx.all<EntityRow & { body: string }>(`SELECT id, hash, body FROM nodes WHERE book_id = ?`, [bookId]);
    const oldEdges = await tx.all<EntityRow>(`SELECT id, hash FROM edges WHERE book_id = ?`, [bookId]);
    const oldAttrs = await tx.all<EntityRow>(
      `SELECT a.id, a.hash FROM attrs a JOIN nodes n ON a.node_id = n.id WHERE n.book_id = ?`,
      [bookId]
    );
    const oldHash = new Map<string, string>();
    const oldBody = new Map<string, string>();
    for (const r of oldNodes) {
      oldHash.set(`nodes:${r.id}`, r.hash);
      oldBody.set(r.id, r.body);
    }
    for (const r of oldEdges) oldHash.set(`edges:${r.id}`, r.hash);
    for (const r of oldAttrs) oldHash.set(`attrs:${r.id}`, r.hash);

    // 各节点当前最大修订序号（删除前查询，供新修订续号）
    const seqRows = await tx.all<{ node_id: string; max: number }>(
      `SELECT r.node_id, MAX(r.seq) AS max FROM revisions r
        WHERE r.node_id IN (SELECT id FROM nodes WHERE book_id = ?) GROUP BY r.node_id`,
      [bookId]
    );
    const maxSeq = new Map<string, number>(seqRows.map((r) => [r.node_id, Number(r.max)]));

    const now = Date.now();
    const instanceId = getInstanceId();
    const changes: EntityChange[] = [];
    const revisions: RevisionEntity[] = [];

    // 清空旧行
    await tx.run(`DELETE FROM attrs WHERE node_id IN (SELECT id FROM nodes WHERE book_id = ?)`, [bookId]);
    await tx.run(`DELETE FROM edges WHERE book_id = ?`, [bookId]);
    await tx.run(`DELETE FROM nodes WHERE book_id = ?`, [bookId]);
    await tx.run(`DELETE FROM nodes_fts WHERE book_id = ?`, [bookId]);

    // 插入 + 差分
    for (const node of entities.nodes) {
      const hash = await hashEntity('nodes', node);
      await tx.run(
        `INSERT INTO nodes(id, book_id, type, title, body, path, created_at, updated_at, erased, hash)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [node.id, node.bookId, node.type, node.title, node.body, node.path ?? null, node.createdAt, node.updatedAt, node.erased ? 1 : 0, hash]
      );
      if (oldHash.get(`nodes:${node.id}`) !== hash) {
        changes.push({ entityName: 'nodes', entityId: node.id, hash, isErased: false, instanceId, agentId, utcDateChanged: now });
      }
      // 正文实质变化（新建含正文 / 编辑）→ 追加修订（单一事务管线：AI 必留底）
      const prevBody = oldBody.get(node.id);
      if (node.body && node.body !== prevBody) {
        revisions.push({
          id: uuidv7(),
          nodeId: node.id,
          seq: (maxSeq.get(node.id) ?? 0) + 1,
          body: node.body,
          author: agentId,
          cause: cause ?? undefined,
          createdAt: now,
        });
      }
      const scope = scopeOf(node.type);
      if (scope) {
        await tx.run(
          `INSERT INTO nodes_fts(book_id, node_id, type, title, content) VALUES(?,?,?,?,?)`,
          [bookId, node.id, node.type, node.title, node.body]
        );
      }
    }
    for (const edge of entities.edges) {
      const hash = await hashEntity('edges', edge);
      await tx.run(
        `INSERT INTO edges(id, from_id, to_id, kind, role, position, book_id, erased, hash)
         VALUES(?,?,?,?,?,?,?,?,?)`,
        [edge.id, edge.fromId, edge.toId, edge.kind, edge.role ?? null, edge.position, edge.bookId, edge.erased ? 1 : 0, hash]
      );
      if (oldHash.get(`edges:${edge.id}`) !== hash) {
        changes.push({ entityName: 'edges', entityId: edge.id, hash, isErased: false, instanceId, agentId, utcDateChanged: now });
      }
    }
    for (const attr of entities.attrs) {
      const hash = await hashEntity('attrs', attr);
      await tx.run(
        `INSERT INTO attrs(id, node_id, type, name, value, inheritable, position, erased, hash)
         VALUES(?,?,?,?,?,?,?,?,?)`,
        [attr.id, attr.nodeId, attr.type, attr.name, attr.value, attr.inheritable ? 1 : 0, attr.position, attr.erased ? 1 : 0, hash]
      );
      if (oldHash.get(`attrs:${attr.id}`) !== hash) {
        changes.push({ entityName: 'attrs', entityId: attr.id, hash, isErased: false, instanceId, agentId, utcDateChanged: now });
      }
    }

    // 消失的旧实体 → 擦除变更
    const newIds = new Set<string>([
      ...entities.nodes.map((n) => `nodes:${n.id}`),
      ...entities.edges.map((e) => `edges:${e.id}`),
      ...entities.attrs.map((a) => `attrs:${a.id}`),
    ]);
    for (const key of oldHash.keys()) {
      if (newIds.has(key)) continue;
      const [entityName, entityId] = key.split(':', 2) as [EntityChange['entityName'], string];
      changes.push({ entityName, entityId, hash: '', isErased: true, instanceId, agentId, utcDateChanged: now });
    }

    await this.writeChangesTx(tx, changes);
    await this.writeRevisionsTx(tx, revisions);
    return entities;
  }

  /** 追加正文修订历史（append-only；seq 已在调用方按节点续号） */
  private async writeRevisionsTx(tx: SqlDriver, revisions: RevisionEntity[]): Promise<void> {
    for (const r of revisions) {
      await tx.run(
        `INSERT INTO revisions(id, node_id, seq, body, author, cause, created_at) VALUES(?,?,?,?,?,?,?)`,
        [r.id, r.nodeId, r.seq, r.body, r.author, r.cause ?? null, r.createdAt]
      );
    }
  }

  /** 整本书擦除（deleteProject / saveAll 清理）：删行 + 写擦除变更 + 清 FTS */
  private async eraseBookTx(tx: SqlDriver, bookId: string): Promise<void> {
    const nodes = await tx.all<{ id: string }>(`SELECT id FROM nodes WHERE book_id = ?`, [bookId]);
    const edges = await tx.all<{ id: string }>(`SELECT id FROM edges WHERE book_id = ?`, [bookId]);
    const attrs = await tx.all<{ id: string }>(
      `SELECT a.id FROM attrs a JOIN nodes n ON a.node_id = n.id WHERE n.book_id = ?`,
      [bookId]
    );
    const now = Date.now();
    const instanceId = getInstanceId();
    const changes: EntityChange[] = [
      ...nodes.map((r) => ({ entityName: 'nodes' as const, entityId: r.id })),
      ...edges.map((r) => ({ entityName: 'edges' as const, entityId: r.id })),
      ...attrs.map((r) => ({ entityName: 'attrs' as const, entityId: r.id })),
    ].map((c) => ({ ...c, hash: '', isErased: true, instanceId, agentId: 'user', utcDateChanged: now }));

    await tx.run(`DELETE FROM attrs WHERE node_id IN (SELECT id FROM nodes WHERE book_id = ?)`, [bookId]);
    await tx.run(`DELETE FROM edges WHERE book_id = ?`, [bookId]);
    await tx.run(`DELETE FROM nodes WHERE book_id = ?`, [bookId]);
    await tx.run(`DELETE FROM nodes_fts WHERE book_id = ?`, [bookId]);
    await this.writeChangesTx(tx, changes);
  }

  private async writeChangesTx(tx: SqlDriver, changes: EntityChange[]): Promise<void> {
    for (const c of changes) {
      await tx.run(
        `INSERT INTO entity_changes(entity_name, entity_id, hash, is_erased, instance_id, agent_id, utc_date_changed)
         VALUES(?,?,?,?,?,?,?)`,
        [c.entityName, c.entityId, c.hash, c.isErased ? 1 : 0, c.instanceId, c.agentId, c.utcDateChanged]
      );
    }
  }

  /**
   * 写非项目配置切片。onlyProvided=true 时仅写 patch 中出现的键（增量）。
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

// ========== 行 ↔ 实体映射 ==========

interface NodeRow {
  id: string; book_id: string; type: string; title: string; body: string;
  path: string | null; created_at: number; updated_at: number; erased: number; hash: string;
}
interface EdgeRow {
  id: string; from_id: string; to_id: string; kind: string; role: string | null;
  position: number; book_id: string; erased: number; hash: string;
}
interface AttrRow {
  id: string; node_id: string; type: string; name: string; value: string;
  inheritable: number; position: number; erased: number; hash: string;
}
interface RevisionRow {
  id: string; node_id: string; seq: number; body: string; author: string;
  cause: string | null; created_at: number;
}

function rowToNode(r: NodeRow): NodeEntity {
  return {
    id: r.id, type: r.type, title: r.title, bookId: r.book_id, body: r.body,
    path: r.path ?? undefined, createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
    erased: r.erased === 1,
  };
}
function rowToEdge(r: EdgeRow): EdgeEntity {
  return {
    id: r.id, fromId: r.from_id, toId: r.to_id, kind: r.kind as EdgeEntity['kind'],
    role: r.role ?? undefined, position: Number(r.position), bookId: r.book_id, erased: r.erased === 1,
  };
}
function rowToAttr(r: AttrRow): AttributeEntity {
  return {
    id: r.id, nodeId: r.node_id, type: r.type as AttributeEntity['type'], name: r.name, value: r.value,
    inheritable: r.inheritable === 1, position: Number(r.position), erased: r.erased === 1,
  };
}
