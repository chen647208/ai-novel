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
} from './app/providers.js';
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
  .register(windowProvider);

const ctx: ProviderContext = { getMainWindow };

app.whenReady().then(async () => {
  logger.info('app', `User data path: ${app.getPath('userData')}`);
  await container.boot(ctx);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  void container.shutdown(ctx);
});
