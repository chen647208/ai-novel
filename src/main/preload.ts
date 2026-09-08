/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
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
  listDirectory: (dirPath: string) => ipcRenderer.invoke(IPC.listDirectory, dirPath),
  openPath: (targetPath: string) => ipcRenderer.invoke(IPC.openPath, targetPath),
  openExternal: (url: string) => ipcRenderer.invoke(IPC.openExternal, url),
  exportPackage: (files: Record<string, string>, defaultPath: string) => ipcRenderer.invoke(IPC.exportPackage, files, defaultPath),
  mcpClient: {
    connect: (id: string, command: string, args?: string[]) => ipcRenderer.invoke(IPC.mcp.clientConnect, id, command, args),
    tools: (id: string) => ipcRenderer.invoke(IPC.mcp.clientTools, id),
    call: (id: string, tool: string, args?: unknown) => ipcRenderer.invoke(IPC.mcp.clientCall, id, tool, args),
    disconnect: (id: string) => ipcRenderer.invoke(IPC.mcp.clientDisconnect, id),
  },
  printPdf: (html: string, defaultPath: string) => ipcRenderer.invoke(IPC.printPdf, html, defaultPath),

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

  // AI 网关（适配器在主进程执行；流式事件经 streamEvent 通道按 requestId 推送）
  aiGateway: {
    complete: (requestId: string, model: unknown, prompt: string, options?: unknown) =>
      ipcRenderer.invoke(IPC.ai.complete, requestId, model, prompt, options),
    openStream: (requestId: string, model: unknown, prompt: string, options?: unknown) =>
      ipcRenderer.invoke(IPC.ai.streamOpen, requestId, model, prompt, options),
    abort: (requestId: string) => ipcRenderer.invoke(IPC.ai.abort, requestId),
    onStreamEvent: (listener: (event: unknown) => void) => {
      const handler = (_event: unknown, payload: unknown): void => listener(payload);
      ipcRenderer.on(IPC.ai.streamEvent, handler);
      return () => ipcRenderer.removeListener(IPC.ai.streamEvent, handler);
    },
  },
  // 安全密钥库（safeStorage/OS 钥匙串；渲染端只持 vault: 引用）
  vault: {
    isAvailable: () => ipcRenderer.invoke(IPC.vault.isAvailable),
    set: (id: string, plaintext: string) => ipcRenderer.invoke(IPC.vault.set, id, plaintext),
    get: (id: string) => ipcRenderer.invoke(IPC.vault.get, id),
    remove: (id: string) => ipcRenderer.invoke(IPC.vault.remove, id),
  },
});
