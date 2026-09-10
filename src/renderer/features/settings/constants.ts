/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { StorageConfig } from '../../../shared/types';
import type { ImportExportMode, SettingsTab } from './types';

export const DEFAULT_SETTINGS_TAB: SettingsTab = 'models';
export const DEFAULT_IMPORT_EXPORT_MODE: ImportExportMode = 'export';

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  dataPath: '',
  useCustomPath: false,
  lastMigration: undefined,
  autoBackupEnabled: true,
  autoBackupInterval: 30,
  maxBackupFiles: 5,
};
