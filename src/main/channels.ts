/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * IPC 通道名称常量 —— 主进程与 preload 共用的唯一事实来源。
 * 渲染进程不直接引用通道名，一律通过 preload 暴露的语义化方法调用。
 */
export const IPC = {
  getAppDataPath: 'get-app-data-path',
  readFile: 'read-file',
  writeFile: 'write-file',
  fileExists: 'file-exists',
  deleteFile: 'delete-file',
  openFileDialog: 'open-file-dialog',
  saveFileDialog: 'save-file-dialog',
  printPdf: 'print-pdf',
  openDirectoryDialog: 'open-directory-dialog',
  listDirectory: 'list-directory',
  vector: {
    initialize: 'vector:initialize',
    addDocuments: 'vector:add-documents',
    updateDocument: 'vector:update-document',
    deleteDocuments: 'vector:delete-documents',
    semanticSearch: 'vector:semantic-search',
    getStats: 'vector:get-stats',
    cleanup: 'vector:cleanup',
    checkConsistency: 'vector:check-consistency',
  },

  // SQLite 数据引擎（主进程托管 node:sqlite，渲染层经类型化 IPC 调用）
  db: {
    exec: 'db:exec',
    run: 'db:run',
    all: 'db:all',
    get: 'db:get',
  },

  // AI 网关（适配器在主进程执行；流式事件按 requestId 多路推送）
  ai: {
    complete: 'ai:complete',
    streamOpen: 'ai:stream:open',
    streamEvent: 'ai:stream:event',
    abort: 'ai:stream:abort',
  },

  // 安全密钥库（safeStorage/OS 钥匙串；渲染端只持 vault: 引用）
  vault: {
    isAvailable: 'vault:is-available',
    set: 'vault:set',
    get: 'vault:get',
    remove: 'vault:remove',
  },
} as const;
