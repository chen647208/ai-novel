/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 退出前让渲染层把未落库的差分写回（docs/design/17 §P0）。
 * 主进程在 before-quit 调 `requestRendererFlush`，渲染层完成后回 `flush-done`；带超时兜底。
 */

import { ipcMain, type BrowserWindow } from 'electron';
import { IPC } from '../channels.js';

export function requestRendererFlush(
  getWindow: () => BrowserWindow | null,
  timeoutMs = 3000,
): Promise<void> {
  const win = getWindow();
  if (!win || win.isDestroyed()) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener(IPC.flushDone, onDone);
      clearTimeout(timer);
      resolve();
    };
    const onDone = (): void => finish();
    ipcMain.on(IPC.flushDone, onDone);
    const timer = setTimeout(finish, timeoutMs);
    win.webContents.send(IPC.flushRequest);
  });
}
