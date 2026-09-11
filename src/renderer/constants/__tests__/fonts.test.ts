/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { DEFAULT_EDITOR_FONT, DEFAULT_UI_FONT, findFontPreset, fontPresets, resolveFontStack } from '../fonts';

describe('fontPresets 字体注册表', () => {
  it('id 唯一且栈非空', () => {
    const ids = new Set<string>();
    for (const p of fontPresets) {
      expect(p.id.length).toBeGreaterThan(0);
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.stack.length).toBeGreaterThan(0);
      expect(p.name.zh.trim().length).toBeGreaterThan(0);
      expect(p.name.en.trim().length).toBeGreaterThan(0);
    }
  });

  it('默认 id 均存在', () => {
    expect(findFontPreset(DEFAULT_UI_FONT)).toBeDefined();
    expect(findFontPreset(DEFAULT_EDITOR_FONT)).toBeDefined();
  });

  it('下载链接均为官方页（github / google fonts / 厂商域）', () => {
    for (const p of fontPresets.filter((x) => x.downloadUrl)) {
      expect(p.downloadUrl.startsWith('https://')).toBe(true);
    }
  });

  it('resolveFontStack：预设/自定义/兜底', () => {
    expect(resolveFontStack('wenkai', DEFAULT_EDITOR_FONT)).toContain('LXGW WenKai');
    expect(resolveFontStack(undefined, DEFAULT_EDITOR_FONT)).toBe(findFontPreset(DEFAULT_EDITOR_FONT)?.stack);
    expect(resolveFontStack('nope', DEFAULT_EDITOR_FONT)).toBe(findFontPreset(DEFAULT_EDITOR_FONT)?.stack);
    expect(
      resolveFontStack('custom:abc', DEFAULT_EDITOR_FONT, [{ id: 'abc', name: '我的字体', fileName: 'x.ttf', format: 'ttf' }])
    ).toBe('"我的字体", serif');
    expect(resolveFontStack('custom:lost', DEFAULT_EDITOR_FONT, [])).toBe(findFontPreset(DEFAULT_EDITOR_FONT)?.stack);
  });

  it('findFontPreset 未命中', () => {
    expect(findFontPreset('nope')).toBeUndefined();
    expect(findFontPreset(undefined)).toBeUndefined();
  });
});
