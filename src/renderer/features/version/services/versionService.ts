/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';

/**
 * 版本服务 - 处理应用版本检查和更新
 */

import { dt, i18n } from '@/i18n';
import { APP_VERSION, GITHUB_API_URL, formatVersion } from '@/shared/version';
import { RELEASES } from '../releases';

export { formatVersion };

const CURRENT_VERSION = APP_VERSION;

export interface VersionInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  releaseNotes: string | null;
  releaseUrl: string | null;
  publishedAt: string | null;
}

export interface UpdateCheckResult {
  success: boolean;
  versionInfo: VersionInfo;
  error?: string;
}

export interface VersionHistoryItem {
  version: string;
  date: string;
  description: string;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AI-Novelist-App',
      },
    });

    if (!response.ok) {
      throw new Error(dt('version:apiFailed', { status: response.status, statusText: response.statusText }));
    }

    const releaseData = await response.json();
    const latestVersion = releaseData.tag_name.replace(/^v/, '');
    const releaseNotes = releaseData.body || dt('version:noReleaseNotes');
    const releaseUrl = releaseData.html_url;
    const publishedAt = releaseData.published_at;

    const versionInfo: VersionInfo = {
      current: CURRENT_VERSION,
      latest: latestVersion,
      hasUpdate: compareVersions(latestVersion, CURRENT_VERSION) > 0,
      releaseNotes,
      releaseUrl,
      publishedAt,
    };

    return {
      success: true,
      versionInfo,
    };
  } catch (error) {
    logger.error('检查更新失败:', error);
    return {
      success: false,
      versionInfo: {
        current: CURRENT_VERSION,
        latest: null,
        hasUpdate: false,
        releaseNotes: null,
        releaseUrl: null,
        publishedAt: null,
      },
      error: error instanceof Error ? error.message : dt('version:unknownError'),
    };
  }
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let index = 0; index < Math.max(parts1.length, parts2.length); index += 1) {
    const num1 = parts1[index] || 0;
    const num2 = parts2[index] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

export function getVersionChangelog(version: string): string {
  const lang = i18n.language.startsWith('en') ? 'en' : 'zh';
  const entry = RELEASES.find((release) => release.version === version);
  return entry?.description[lang] ?? dt('version:fallbackChangelog');
}

export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}

export function getVersionHistory(): VersionHistoryItem[] {
  const lang = i18n.language.startsWith('en') ? 'en' : 'zh';
  return RELEASES.map((release) => ({
    version: release.version,
    date: release.date,
    description: release.description[lang],
  }));
}

export function getCurrentVersionInfo(): VersionInfo {
  return {
    current: CURRENT_VERSION,
    latest: CURRENT_VERSION,
    hasUpdate: false,
    releaseNotes: getVersionChangelog(CURRENT_VERSION),
    releaseUrl: null,
    publishedAt: getVersionHistory().find((item) => item.version === CURRENT_VERSION)?.date || null,
  };
}
