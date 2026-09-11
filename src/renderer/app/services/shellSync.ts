/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { logger } from '../../shared/utils/logger';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * 系统壳同步（docs/design/15）：托盘/自启/代理三项变更即下发主进程。
 * 浏览器预览无 electronAPI 时静默跳过；失败记日志不打断用户。
 */

type ElectronAPI = NonNullable<Window['electronAPI']>;

function api(): ElectronAPI | undefined {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
}

function snapshot(): { minimizeToTray?: boolean; autoLaunch?: boolean; proxyUrl: string } {
  const s = useSettingsStore.getState();
  return { minimizeToTray: s.minimizeToTray, autoLaunch: s.autoLaunch, proxyUrl: s.proxy?.url ?? '' };
}

/** 即时下发当前三项（启动与变更共用入口）。 */
export async function pushShellSettings(): Promise<void> {
  const a = api();
  if (!a) return;
  const { minimizeToTray, autoLaunch, proxyUrl } = snapshot();
  try {
    await a.shell.sync({ minimizeToTray, autoLaunch });
  } catch (err) {
    logger.warn('系统壳设置同步失败:', err);
  }
  try {
    await a.net.setProxy(proxyUrl);
  } catch (err) {
    logger.warn('代理设置同步失败:', err);
  }
}

/** 订阅三项变化并下发；返回解绑函数。幂等由调用方保证（bootstrap 内一次）。 */
export function startShellSync(): () => void {
  let last = JSON.stringify(snapshot());
  void pushShellSettings();
  return useSettingsStore.subscribe(() => {
    const next = JSON.stringify(snapshot());
    if (next === last) return;
    last = next;
    void pushShellSettings();
  });
}
