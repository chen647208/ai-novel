/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 代理配置（docs/design/15）：地址校验、本地域豁免、全局 dispatcher 应用。
 *
 * 网关适配器统一走全局 fetch，dispatcher 在此单点切换：空地址即直连；
 * http/https 走 ProxyAgent，socks5 走 Socks5ProxyAgent（undici 原生支持）。
 */

import { Agent, ProxyAgent, Socks5ProxyAgent, fetch as undiciFetch, setGlobalDispatcher } from 'undici';
import { logger } from '../logger.js';

/** 代理测试超时毫秒（改值只改一处）。 */
export const PROXY_TEST_TIMEOUT_MS = 10000;

/** 连通探测目标（轻量 204，无鉴权；用户侧手动触发，不进 CI）。 */
export const PROXY_PROBE_URL = 'https://www.gstatic.com/generate_204';

const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'socks5:', 'socks5h:']);

export type ProxyParseResult = { ok: true; url: string } | { ok: false; error: 'bad-url' | 'bad-scheme' };

/** 代理地址校验：空串合法（直连）；其余须带 http/https/socks5 协议头。 */
export function parseProxyUrl(input: string): ProxyParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, url: '' };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'bad-url' };
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) return { ok: false, error: 'bad-scheme' };
  if (!parsed.hostname) return { ok: false, error: 'bad-url' };
  return { ok: true, url: parsed.toString() };
}

/**
 * 本地域豁免：Ollama 等本地服务不走代理（直连更快，也避开代理劫持）。
 * 命中 loopback 主机名即豁免；其余一律走代理。
 */
export function shouldBypassProxy(target: string): boolean {
  let host: string;
  try {
    host = new URL(target).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

/** 按协议构造 dispatcher（纯构造，便于测试；应用走 applyProxyConfig）。 */
export function buildDispatcher(proxyUrl: string): Agent | ProxyAgent | Socks5ProxyAgent {
  const scheme = new URL(proxyUrl).protocol;
  if (scheme === 'socks5:' || scheme === 'socks5h:') return new Socks5ProxyAgent(proxyUrl);
  return new ProxyAgent(proxyUrl);
}

let activeProxyUrl = '';

/** 当前生效的代理地址（空即直连；诊断用）。 */
export function getActiveProxyUrl(): string {
  return activeProxyUrl;
}

/** 应用代理配置：空串恢复默认直连；非法地址抛错（调用方转 IPC 错误）。 */
export function applyProxyConfig(proxyUrl: string): void {
  const parsed = parseProxyUrl(proxyUrl);
  if (!parsed.ok) throw new Error(`非法代理地址：${parsed.error}`);
  if (parsed.url === activeProxyUrl) return;
  activeProxyUrl = parsed.url;
  setGlobalDispatcher(parsed.url ? buildDispatcher(parsed.url) : new Agent());
  logger.info('net', parsed.url ? `代理已启用：${parsed.url}` : '代理已关闭（直连）');
}

export interface ProxyTestResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/** Chromium 会话代理规则（渲染端模型列表拉取走 Chromium 网络栈，与网关双覆盖）。 */
export type ChromiumProxyRules = { mode: 'direct' } | { mode: 'fixed_servers'; proxyRules: string };

export function buildChromiumProxyRules(proxyUrl: string): ChromiumProxyRules {
  const parsed = parseProxyUrl(proxyUrl);
  if (!parsed.ok) throw new Error(`非法代理地址：${parsed.error}`);
  if (!parsed.url) return { mode: 'direct' };
  const u = new URL(parsed.url);
  const host = u.host;
  if (u.protocol === 'socks5:' || u.protocol === 'socks5h:') {
    return { mode: 'fixed_servers', proxyRules: `socks=socks5://${host}` };
  }
  return { mode: 'fixed_servers', proxyRules: `http=${host};https=${host}` };
}

/** 网关 fetch 单出口：loopback 目标强制直连（Ollama 豁免），其余走全局 dispatcher。 */
export async function proxiedFetch(url: string, init?: RequestInit): Promise<Response> {
  if (shouldBypassProxy(url)) {
    return undiciFetch(url, { ...init, dispatcher: new Agent() });
  }
  return fetch(url, init);
}

/** 连通测试：经给定代理（空即直连）GET 探测地址，超时或异常即失败。 */
export async function testProxy(proxyUrl: string, probeUrl: string = PROXY_PROBE_URL): Promise<ProxyTestResult> {
  const parsed = parseProxyUrl(proxyUrl);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const dispatcher = parsed.url ? buildDispatcher(parsed.url) : new Agent();
  try {
    const res = await undiciFetch(probeUrl, {
      method: 'GET',
      dispatcher,
      signal: AbortSignal.timeout(PROXY_TEST_TIMEOUT_MS),
    });
    return res.ok || res.status === 204
      ? { ok: true, status: res.status }
      : { ok: false, error: `http-${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
