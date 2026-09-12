/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 自动更新（docs/features/version）：打包版接 electron-updater 原生链路，
 * 检查 → 显式下载（autoDownload=false，用户点按钮才下）→ 退出时安装。
 * 开发版不注册（渲染层退回 GitHub 版本查询 + 外部下载页）。
 *
 * 元数据来源：electron-builder 的 github publish 生成 latest*.yml 随 Release 发布。
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import updaterPkg from 'electron-updater';

import type { UpdaterStatus } from '../shared/types.js';
import { IPC } from './channels.js';
import { logger } from './logger.js';

const { autoUpdater } = updaterPkg;

function broadcast(status: UpdaterStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC.updater.event, status);
  }
}

let registered = false;

export function registerUpdaterIpc(): void {
  // 开发/网页预览无 app-update.yml，退回渲染层 GitHub 查询；dry-run 例外（读 dev-app-update.yml）
  const dryRun = process.env.HONGYUE_UPDATE_DRY_RUN === '1';
  if (!app.isPackaged && !dryRun) return;
  if (registered) return;
  registered = true;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  // 渠道可经环境变量覆盖（如 beta）；dry-run 时常读 dev-app-update.yml 并允许预发布
  const channel = process.env.HONGYUE_UPDATE_CHANNEL;
  if (channel) autoUpdater.channel = channel;
  if (dryRun) {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.allowPrerelease = true;
  }
  autoUpdater.on('checking-for-update', () => broadcast({ t: 'checking' }));
  autoUpdater.on('update-available', (info) => broadcast({ t: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => broadcast({ t: 'not-available' }));
  autoUpdater.on('download-progress', (p) => broadcast({ t: 'progress', percent: p.percent }));
  autoUpdater.on('update-downloaded', (info) => broadcast({ t: 'downloaded', version: info.version }));
  autoUpdater.on('error', (err) => broadcast({ t: 'error', message: err.message }));

  ipcMain.handle(IPC.updater.check, async () => {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true as const, version: result?.updateInfo.version ?? null };
  });
  ipcMain.handle(IPC.updater.download, async () => {
    await autoUpdater.downloadUpdate();
    return { ok: true as const };
  });
  ipcMain.handle(IPC.updater.install, () => {
    autoUpdater.quitAndInstall();
    return { ok: true as const };
  });

  logger.info('updater', '原生自动更新已启用');
}
