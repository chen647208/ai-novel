/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 托盘与自启（docs/design/15）：托盘图标常驻（复用应用图标），单击恢复窗口，
 * 右键菜单退出；关闭窗口默认最小化到托盘（设置页可关）；开机自启走
 * app.setLoginItemSettings（设置页开关，渲染层经 shell:sync 下发）。
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, type BrowserWindow, ipcMain, Menu, Tray } from 'electron';

import { IPC } from '../channels.js';
import { logger } from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ShellSettings {
  minimizeToTray?: boolean;
  autoLaunch?: boolean;
}

/** 关闭行为纯判定（缺席最小化到托盘；退出流程中一律真关）。 */
export function shouldHideOnClose(settings: ShellSettings, isQuitting: boolean): boolean {
  if (isQuitting) return false;
  return settings.minimizeToTray !== false;
}

let tray: Tray | null = null;
let quitting = false;
let shellSettings: ShellSettings = {};

/** 退出流程标记（main.ts before-quit 调用，关闭拦截据此放行）。 */
export function setQuitting(): void {
  quitting = true;
}

function iconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'tray.png')
    : path.join(__dirname, '../../../../src/assets/tray.png');
}

function showWindow(getWindow: () => BrowserWindow | null): void {
  const win = getWindow();
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/** 托盘创建（幂等；图标复用应用图标，单击恢复，右键退出）。 */
export function setupTray(getWindow: () => BrowserWindow | null): void {
  if (tray) return;
  try {
    tray = new Tray(iconPath());
  } catch (err) {
    logger.warn('tray', '托盘创建失败（无图标环境），关闭最小化到托盘', err);
    tray = null;
    return;
  }
  tray.setToolTip('红月创作');
  tray.on('click', () => showWindow(getWindow));
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => showWindow(getWindow),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ]));
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}

/** 渲染层设置下发：自启即时生效，最小化行为由窗口 close 拦截读取。 */
export function applyShellSettings(settings: ShellSettings): void {
  shellSettings = { ...settings };
  try {
    app.setLoginItemSettings({ openAtLogin: settings.autoLaunch === true });
  } catch (err) {
    logger.warn('tray', '开机自启设置失败', err);
  }
}

/** 窗口 close 拦截谓词（window.ts 调用：true 即隐藏不关）。 */
export function interceptClose(): boolean {
  return shouldHideOnClose(shellSettings, quitting);
}

export function registerShellIpc(getWindow: () => BrowserWindow | null): void {
  setupTray(getWindow);
  ipcMain.handle(IPC.shell.sync, async (_event, settings: ShellSettings) => {
    if (!settings || typeof settings !== 'object') throw new TypeError('Invalid shell:sync arguments');
    applyShellSettings(settings);
    return { ok: true as const };
  });
}
