/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { isPluginFrameMessage, PluginFrame } from '../PluginFrame';

describe('PluginFrame（S3 插件 UI 沙箱宿主）', () => {
  it('iframe 走 allow-scripts（null origin）', () => {
    const html = renderToStaticMarkup(<PluginFrame html="<p>hi</p>" />);
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).not.toContain('allow-same-origin');
    expect(html.toLowerCase()).toContain('srcdoc=');
  });

  it('消息形状校验', () => {
    expect(isPluginFrameMessage({ type: 'ready' })).toBe(true);
    expect(isPluginFrameMessage({ type: '', payload: 1 })).toBe(false);
    expect(isPluginFrameMessage({ payload: 1 })).toBe(false);
    expect(isPluginFrameMessage('hello')).toBe(false);
    expect(isPluginFrameMessage(null)).toBe(false);
  });
});
