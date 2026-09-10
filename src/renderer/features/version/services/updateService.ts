/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 原生自动更新桥（docs/features/version）：打包版经 preload 的 updater 调主进程
 * electron-updater；开发/网页预览无此能力，调用方据此退回 GitHub 版本查询与下载页。
 */

import type { UpdaterStatus } from '@shared/types';

type UpdaterApi = NonNullable<NonNullable<Window['electronAPI']>['updater']>;

function api(): UpdaterApi | undefined {
  return typeof window !== 'undefined' ? window.electronAPI?.updater : undefined;
}

/** 当前环境是否有原生更新能力（打包版桌面端）。 */
export function hasNativeUpdater(): boolean {
  return !!api();
}

/** 触发主进程检查更新，返回可用版本号（无更新为 null）。 */
export async function nativeCheckForUpdate(): Promise<string | null> {
  const u = api();
  if (!u) return null;
  const result = await u.check();
  return result.version;
}

/** 下载已发现的更新（用户点按钮才下）。 */
export async function nativeDownloadUpdate(): Promise<void> {
  await api()?.download();
}

/** 退出并安装已下载的更新。 */
export async function nativeInstallUpdate(): Promise<void> {
  await api()?.install();
}

/** 订阅更新状态事件；无原生能力返回空解绑函数。 */
export function onUpdaterStatus(listener: (status: UpdaterStatus) => void): () => void {
  const u = api();
  if (!u) return () => undefined;
  return u.onStatus(listener);
}
