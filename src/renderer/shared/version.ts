/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 应用版本单一事实源。
 * package.json 是唯一手改点 → vite define 注入 __APP_VERSION__ → 本模块统一导出。
 * 所有 UI（徽章/设置页/更新弹窗）只从这里取版本，禁止各自 declare/散落拼接。
 */

declare const __APP_VERSION__: string;

function resolveVersion(): string {
  try {
    if (typeof __APP_VERSION__ === 'string' && __APP_VERSION__.length > 0) {
      return __APP_VERSION__;
    }
  } catch {
    // 测试 / 非 vite 环境兜底
  }
  return '0.0.0-dev';
}

export const APP_VERSION: string = resolveVersion();

export const GITHUB_REPO = 'chen647208/hongyue-creation';
export const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;

export function formatVersion(version: string | null): string {
  if (!version) return 'v?';
  return version.startsWith('v') ? version : `v${version}`;
}

export function getDisplayVersion(): string {
  return formatVersion(APP_VERSION);
}
