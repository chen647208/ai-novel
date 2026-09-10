/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 诊断包内容收集（纯函数，无 Electron 依赖）：日志、窗口几何与存储配置、环境信息。
 * 只收文本与小文件，不读数据库、不读密钥。
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/** 单个诊断文件大小上限（超过跳过，避免把大日志塞进包）。 */
export const MAX_DIAGNOSTIC_FILE_BYTES = 5_000_000;

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  node: string;
  platform: string;
  arch: string;
}

async function collectInto(files: Record<string, string>, dir: string, prefix: string): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await collectInto(files, full, rel);
      continue;
    }
    try {
      const buf = await fs.readFile(full);
      if (buf.length > MAX_DIAGNOSTIC_FILE_BYTES) continue;
      files[rel] = buf.toString('utf-8');
    } catch {
      // 读不了的跳过
    }
  }
}

/** 组装诊断文件集：app-info.json + logs/** + window-state.json / storage-config.json。 */
export async function collectDiagnostics(userData: string, appInfo: AppInfo): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  files['app-info.json'] = JSON.stringify({ ...appInfo, userData }, null, 2);
  await collectInto(files, path.join(userData, 'logs'), 'logs');
  for (const name of ['window-state.json', 'storage-config.json']) {
    try {
      files[name] = await fs.readFile(path.join(userData, name), 'utf-8');
    } catch {
      // 缺席即不收
    }
  }
  return files;
}
