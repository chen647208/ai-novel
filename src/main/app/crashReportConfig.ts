/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 崩溃上报配置（docs/design/15）：默认只本地留存转储；用户在设置里开启且宿主配置了
 * 上报地址（`HONGYUE_CRASH_REPORT_URL`，须 https）时才上传。改动重启后生效。
 */

import fs from 'node:fs';
import path from 'node:path';

import { app } from 'electron';

const FILE_NAME = 'crash-reporting.json';

export interface CrashReportingConfig {
  enabled: boolean;
}

export function readCrashReportingConfig(): CrashReportingConfig {
  try {
    const raw = fs.readFileSync(path.join(app.getPath('userData'), FILE_NAME), 'utf-8');
    return { enabled: (JSON.parse(raw) as { enabled?: unknown }).enabled === true };
  } catch {
    return { enabled: false };
  }
}

export function writeCrashReportingConfig(config: CrashReportingConfig): void {
  try {
    fs.writeFileSync(path.join(app.getPath('userData'), FILE_NAME), JSON.stringify(config), 'utf-8');
  } catch {
    // 写失败不阻断设置流程
  }
}

/** 上报地址来自环境变量（须 https）；未配置则只本地留存。 */
export function crashSubmitUrl(): string | undefined {
  const url = process.env.HONGYUE_CRASH_REPORT_URL;
  return url && /^https:\/\//.test(url) ? url : undefined;
}
