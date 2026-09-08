/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 网络代理 IPC（docs/design/15）：渲染层下发代理地址，主进程双覆盖
 * （网关 undici dispatcher + Chromium 会话代理），测试连接返回对照结果。
 */
import { ipcMain, session } from 'electron';
import { IPC } from '../channels.js';
import { logger } from '../logger.js';
import { applyProxyConfig, buildChromiumProxyRules, parseProxyUrl, testProxy } from './proxy.js';

export function registerProxyIpc(): void {
  // 下发代理（空串即直连；非法地址直接抛错，渲染端转提示）
  ipcMain.handle(IPC.net.setProxy, async (_event, url: string) => {
    if (typeof url !== 'string') throw new TypeError('Invalid net:set-proxy arguments');
    const parsed = parseProxyUrl(url);
    if (!parsed.ok) throw new Error(`非法代理地址：${parsed.error}`);
    applyProxyConfig(parsed.url);
    try {
      await session.defaultSession.setProxy(buildChromiumProxyRules(parsed.url));
    } catch (err) {
      logger.warn('net', 'Chromium 代理规则应用失败（网关侧仍生效）', err);
    }
    return { ok: true as const };
  });

  // 连通测试（用户手动触发；超时 10 秒，见 PROXY_TEST_TIMEOUT_MS）
  ipcMain.handle(IPC.net.testProxy, async (_event, url: string) => {
    if (typeof url !== 'string') throw new TypeError('Invalid net:test-proxy arguments');
    return testProxy(url);
  });
}
