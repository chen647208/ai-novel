/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 渲染层安全头：打包版注入 Content-Security-Policy。
 *
 * 开发版由 Vite 提供资源且依赖内联样式与 HMR websocket，故不注入（避免误伤）；
 * 打包版锁定脚本来源（禁内联/ eval）、禁插件与嵌套框架，仅放行运行所需的
 * 样式内联、data/blob 资源与模型接口网络。
 */

import { app, session } from 'electron';
import { logger } from '../logger.js';

/** 打包版 CSP（值集中在此，改策略只改一处）。 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: http: ws: wss:",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join('; ');

/** 仅打包版生效：注册响应头改写，给每个文档响应加 CSP。 */
export function applySecurityHeaders(): void {
  if (!app.isPackaged) return;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CONTENT_SECURITY_POLICY],
      },
    });
  });
  logger.info('security', 'CSP 已启用（打包版）');
}
