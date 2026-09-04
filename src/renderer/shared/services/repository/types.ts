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

/**
 * SQL 驱动抽象 —— repository 逻辑只依赖这一层，桌面(node:sqlite via IPC)
 * 与网页(wa-sqlite via OPFS)各实现一份，schema 与查询语句两端共用。
 *
 * 约定：所有语句的值一律走 params 绑定，调用方不得拼接用户输入进 SQL 文本。
 */
export type SqlValue = string | number | bigint | null | Uint8Array;

export interface SqlRunResult {
  changes: number;
  lastInsertRowid: number;
}

export interface SqlDriver {
  /** 执行一条或多条无返回语句（建表、PRAGMA 等） */
  exec(sql: string): Promise<void>;
  /** 执行写入语句，返回受影响行数与自增主键 */
  run(sql: string, params?: SqlValue[]): Promise<SqlRunResult>;
  /** 查询多行 */
  all<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /** 查询单行 */
  get<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T | undefined>;
  /** 事务：回调内的所有写操作原子提交，抛错则回滚 */
  transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T>;
  /** 关闭连接 */
  close(): Promise<void>;
}

/**
 * 全文检索命中项（章节正文 / 知识库条目）。
 */
export interface SearchHit {
  scope: 'chapter' | 'knowledge';
  projectId: string;
  /** chapter_id 或 knowledge item_id */
  id: string;
  title?: string;
  category?: string;
  /** 带高亮标记的上下文片段 */
  snippet: string;
  /** FTS rank，越小越相关 */
  rank: number;
}

export interface SearchOptions {
  /** 限定在某本书内检索 */
  projectId?: string;
  /** 返回条数上限，默认 50 */
  limit?: number;
}

/**
 * 应用数据的唯一入口。UI/App 只依赖此接口，
 * 具体后端（JSON 文件 / SQLite）由 index.ts 按运行环境选择。
 *
 * Phase 0 先覆盖现有消费者用到的方法，保持零行为变更；
 * 增量写(saveProject/deleteProject)与检索(search)在后续阶段扩展。
 */
export interface StorageRepository {
  /**
   * 可选的后端初始化（建表迁移、首启从旧存储导入等）。
   * JSON 后端无需实现；SQLite 后端在首次 loadAll 前由 App 调用一次。
   */
  init?(): Promise<void>;
  /** 异步加载全量状态（Electron 走文件，浏览器走 localStorage） */
  loadAll(): Promise<AppState | null>;
  /** 同步读取（仅浏览器模式有效；Electron 返回 null，启动改用 loadAll） */
  loadAllSync(): AppState | null;
  /** 整体写入全量状态 */
  saveAll(state: AppState): Promise<void>;
  /** 清空全部数据 */
  clear(): Promise<void>;

  /** 增量写入/更新单个项目（含其 FTS 索引刷新） */
  saveProject(project: Project): Promise<void>;
  /** 删除单个项目（含其 FTS 索引） */
  deleteProject(id: string): Promise<void>;
  /** 仅写入给定的非项目配置切片 */
  saveSettings(patch: Partial<AppState>): Promise<void>;

  /** 全文检索（SQLite 走 FTS5；JSON 后端走内存过滤） */
  search(query: string, options?: SearchOptions): Promise<SearchHit[]>;

  /** 导出全量数据（触发保存对话框 / 浏览器下载） */
  exportAll(state: AppState): Promise<void>;
  /** 导入全量数据（触发打开对话框），返回规范化后的状态 */
  importAll(): Promise<AppState>;
  /** 导出单本书 */
  exportBook(project: Project): Promise<void>;
  /** 导入单本书 */
  importBook(): Promise<Project>;

  /** 读取一致性检查配置 */
  loadConsistencyCheckConfig(): Promise<ConsistencyCheckConfig | null>;
  /** 读取一致性检查提示词模板 */
  loadConsistencyPrompts(): Promise<ConsistencyCheckPromptTemplate[] | null>;

  /** 读取存储子系统配置（路径、备份开关等） */
  getStorageConfig(): Promise<StorageConfig>;
  /** 更新存储子系统配置 */
  updateStorageConfig(config: StorageConfig): Promise<boolean>;
}
