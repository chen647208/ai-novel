/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { buildChromiumProxyRules, buildDispatcher, parseProxyUrl, shouldBypassProxy } from '../proxy.js';

describe('parseProxyUrl', () => {
  it('空串合法（直连）', () => {
    expect(parseProxyUrl('  ')).toEqual({ ok: true, url: '' });
  });

  it('http/https/socks5 通过', () => {
    expect(parseProxyUrl('http://127.0.0.1:7890').ok).toBe(true);
    expect(parseProxyUrl('https://proxy.local:8080').ok).toBe(true);
    expect(parseProxyUrl('socks5://127.0.0.1:1080').ok).toBe(true);
  });

  it('非法地址与协议拒绝', () => {
    expect(parseProxyUrl('not a url')).toEqual({ ok: false, error: 'bad-url' });
    expect(parseProxyUrl('ftp://x:21')).toEqual({ ok: false, error: 'bad-scheme' });
    expect(parseProxyUrl('http://')).toEqual({ ok: false, error: 'bad-url' });
  });
});

describe('shouldBypassProxy', () => {
  it('loopback 豁免，外网不豁免', () => {
    expect(shouldBypassProxy('http://localhost:11434/api/tags')).toBe(true);
    expect(shouldBypassProxy('http://127.0.0.1:11434')).toBe(true);
    expect(shouldBypassProxy('https://api.deepseek.com/chat')).toBe(false);
    expect(shouldBypassProxy('not-a-url')).toBe(false);
  });
});

describe('buildChromiumProxyRules', () => {
  it('空即 direct，http 双写，socks 走 socks 规则', () => {
    expect(buildChromiumProxyRules('')).toEqual({ mode: 'direct' });
    expect(buildChromiumProxyRules('http://127.0.0.1:7890')).toEqual({
      mode: 'fixed_servers',
      proxyRules: 'http=127.0.0.1:7890;https=127.0.0.1:7890',
    });
    expect(buildChromiumProxyRules('socks5://127.0.0.1:1080')).toEqual({
      mode: 'fixed_servers',
      proxyRules: 'socks=socks5://127.0.0.1:1080',
    });
  });
});

describe('buildDispatcher', () => {
  it('socks5 与 http 走不同 Agent', () => {
    expect(buildDispatcher('socks5://127.0.0.1:1080').constructor.name).toBe('Socks5ProxyAgent');
    expect(buildDispatcher('http://127.0.0.1:7890').constructor.name).toBe('ProxyAgent');
  });
});
