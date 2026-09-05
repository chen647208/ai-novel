/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { IPC } from '../channels.js';
import { registerVectorIpc } from '../vector-ipc.js';
import { registerSqliteIpc, closeSqlite } from '../sqlite-ipc.js';
import type { Provider, ProviderContext } from './container.js';
import { createWindow } from './window.js';

/**
 * 主进程各子系统的 Provider 化（docs/design/02）。
 * 每个 Provider 的 boot 即原 main.ts 里的一次 registerXxxIpc / createWindow 调用，
 * 行为与 IPC 契约完全不变，只是纳入统一生命周期。
 */

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`Invalid ${label}: expected non-empty string`);
  }
}

/** 窗口 Provider：创建主窗口。置于最后 boot（IPC 先就绪），最先 shutdown 无操作。 */
export const windowProvider: Provider = {
  name: 'window',
  boot() {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  },
};

/** 文件系统 Provider：本地优先工具，导入/导出允许用户选任意路径，仅校验入参类型。 */
export const fileProvider: Provider = {
  name: 'file',
  boot() {
    ipcMain.handle(IPC.getAppDataPath, () => app.getPath('userData'));

    ipcMain.handle(IPC.readFile, async (_event, filePath: string) => {
      assertString(filePath, 'filePath');
      return fs.readFile(filePath, 'utf-8');
    });

    ipcMain.handle(IPC.writeFile, async (_event, filePath: string, data: string) => {
      assertString(filePath, 'filePath');
      if (typeof data !== 'string') {
        throw new TypeError('Invalid data: expected string');
      }
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, data, 'utf-8');
      return true;
    });

    ipcMain.handle(IPC.fileExists, async (_event, filePath: string) => {
      assertString(filePath, 'filePath');
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    });

    ipcMain.handle(IPC.listDirectory, async (_event, dirPath: string) => {
      assertString(dirPath, 'dirPath');
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries.map((e) => ({ name: e.name, type: e.isDirectory() ? ('directory' as const) : ('file' as const) }));
      } catch {
        return [];
      }
    });

    ipcMain.handle(IPC.deleteFile, async (_event, filePath: string) => {
      assertString(filePath, 'filePath');
      await fs.unlink(filePath);
      return true;
    });
  },
};

/** 对话框 Provider：以主窗口为父窗口。 */
export const dialogProvider: Provider = {
  name: 'dialog',
  boot(ctx: ProviderContext) {
    ipcMain.handle(IPC.openFileDialog, async (_event, options: Electron.OpenDialogOptions) => {
      const win = ctx.getMainWindow();
      return win ? dialog.showOpenDialog(win, options ?? {}) : dialog.showOpenDialog(options ?? {});
    });

    ipcMain.handle(IPC.saveFileDialog, async (_event, options: Electron.SaveDialogOptions) => {
      const win = ctx.getMainWindow();
      return win ? dialog.showSaveDialog(win, options ?? {}) : dialog.showSaveDialog(options ?? {});
    });

    ipcMain.handle(IPC.openDirectoryDialog, async (_event, options: Electron.OpenDialogOptions) => {
      const merged: Electron.OpenDialogOptions = {
        title: '选择目录',
        properties: ['openDirectory', 'createDirectory'],
        ...options,
      };
      const win = ctx.getMainWindow();
      return win ? dialog.showOpenDialog(win, merged) : dialog.showOpenDialog(merged);
    });
  },
};

/** 向量存储 Provider：主进程代理 vectra 集合。 */
export const vectorProvider: Provider = {
  name: 'vector',
  boot() {
    registerVectorIpc();
  },
};

/** SQLite 数据引擎 Provider：node:sqlite 连接，退出时关闭。 */
export const sqliteProvider: Provider = {
  name: 'sqlite',
  boot() {
    registerSqliteIpc();
  },
  shutdown() {
    closeSqlite();
  },
};
