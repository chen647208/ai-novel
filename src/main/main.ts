/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { app } from 'electron';
import { logger } from './logger.js';
import { AppContainer, type ProviderContext } from './app/container.js';
import { getMainWindow } from './app/window.js';
import {
  windowProvider,
  fileProvider,
  dialogProvider,
  vectorProvider,
  sqliteProvider,
  mcpClientProvider,
  netProvider,
  shellProvider,
} from './app/providers.js';
import { setQuitting } from './app/tray.js';
import { applySecurityHeaders } from './app/security.js';
import { legacyDataDir, migrateLegacyDataDir, shouldRunMigration, standardDataDir } from './app/dataDir.js';
import { secureStoreProvider } from './app/secureStore.js';
import { aiGatewayProvider } from './ai/gateway.js';

/**
 * 应用入口：装配 Provider 容器并按序启动（docs/design/02）。
 * 子系统实现见 src/main/app/providers.ts 与 src/main/ai/gateway.ts；此处只负责生命周期编排。
 */
const container = new AppContainer()
  .register(sqliteProvider)
  .register(vectorProvider)
  .register(fileProvider)
  .register(dialogProvider)
  .register(secureStoreProvider)
  .register(aiGatewayProvider)
  .register(mcpClientProvider)
  .register(netProvider)
  .register(shellProvider)
  .register(windowProvider);

const ctx: ProviderContext = { getMainWindow };

// 主进程兜底：未捕获异常与未处理 Promise 一律记日志，不让进程静默崩溃
process.on('uncaughtException', (error) => {
  logger.error('main', 'Uncaught exception in main process', error);
});
process.on('unhandledRejection', (reason) => {
  logger.error('main', 'Unhandled rejection in main process', reason);
});

app.whenReady().then(async () => {
  applySecurityHeaders();
  logger.info('app', `User data path: ${app.getPath('userData')}`);
  // 更名迁移：仅标准路径跑（--user-data-dir 隔离的测试/调试实例不碰真实数据）
  if (shouldRunMigration(app.getPath('userData'), standardDataDir())) {
    try {
      await migrateLegacyDataDir(legacyDataDir(), app.getPath('userData'));
    } catch (err) {
      logger.warn('datadir', '旧数据目录迁移失败（下次启动重试，不挡启动）', err);
    }
  }
  await container.boot(ctx);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  setQuitting();
  void container.shutdown(ctx);
});
