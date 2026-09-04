/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './channels.js';

/**
 * preload：以语义化方法暴露主进程能力。
 * 渲染进程拿不到 ipcRenderer / Node API，所有通道名集中来自 channels.ts。
 * 注意：本文件编译为 CommonJS（沙箱化 preload 环境要求）。
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统操作
  getAppDataPath: () => ipcRenderer.invoke(IPC.getAppDataPath),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC.readFile, filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke(IPC.writeFile, filePath, data),
  exists: (filePath: string) => ipcRenderer.invoke(IPC.fileExists, filePath),
  unlink: (filePath: string) => ipcRenderer.invoke(IPC.deleteFile, filePath),

  // 对话框
  openFileDialog: (options: unknown) => ipcRenderer.invoke(IPC.openFileDialog, options),
  saveFileDialog: (options: unknown) => ipcRenderer.invoke(IPC.saveFileDialog, options),
  openDirectoryDialog: (options: unknown) => ipcRenderer.invoke(IPC.openDirectoryDialog, options),

  // 向量存储操作（主进程托管 Vectra 索引）
  vector: {
    initialize: () => ipcRenderer.invoke(IPC.vector.initialize),
    addDocuments: (projectId: string, documents: unknown[]) => ipcRenderer.invoke(IPC.vector.addDocuments, projectId, documents),
    updateDocument: (projectId: string, document: unknown) => ipcRenderer.invoke(IPC.vector.updateDocument, projectId, document),
    deleteDocuments: (projectId: string, documentIds: string[]) => ipcRenderer.invoke(IPC.vector.deleteDocuments, projectId, documentIds),
    semanticSearch: (projectId: string, queryEmbedding: number[], options?: unknown) =>
      ipcRenderer.invoke(IPC.vector.semanticSearch, projectId, queryEmbedding, options),
    getStats: (projectId: string) => ipcRenderer.invoke(IPC.vector.getStats, projectId),
    cleanup: (projectId: string) => ipcRenderer.invoke(IPC.vector.cleanup, projectId),
    checkConsistency: (projectId: string) => ipcRenderer.invoke(IPC.vector.checkConsistency, projectId),
  },

  // SQLite 数据引擎（主进程托管 node:sqlite）
  db: {
    exec: (sql: string) => ipcRenderer.invoke(IPC.db.exec, sql),
    run: (sql: string, params?: unknown[]) => ipcRenderer.invoke(IPC.db.run, sql, params),
    all: (sql: string, params?: unknown[]) => ipcRenderer.invoke(IPC.db.all, sql, params),
    get: (sql: string, params?: unknown[]) => ipcRenderer.invoke(IPC.db.get, sql, params),
  },
});
