/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { checkPluginFileName, checkPluginRelPath, joinPluginPath, PLUGIN_DENY_SEGMENTS } from '../pathGate.js';

describe('checkPluginRelPath（§11.2 词法两道门）', () => {
  it('规范化相对路径', () => {
    expect(checkPluginRelPath('./skills/')).toEqual({ ok: true, rel: 'skills' });
    expect(checkPluginRelPath('a/b')).toEqual({ ok: true, rel: 'a/b' });
  });

  it('拒绝绝对路径 / 越界 / 拒绝清单 / 空', () => {
    expect(checkPluginRelPath('/etc/passwd').ok).toBe(false);
    expect(checkPluginRelPath('C:\\Windows').ok).toBe(false);
    expect(checkPluginRelPath('../secrets').ok).toBe(false);
    expect(checkPluginRelPath('a/../../b').ok).toBe(false);
    expect(checkPluginRelPath('node_modules/x').ok).toBe(false);
    expect(checkPluginRelPath('.git/config').ok).toBe(false);
    expect(checkPluginRelPath('').ok).toBe(false);
  });

  it('文件名拒绝分隔符与点目录', () => {
    expect(checkPluginFileName('ok.md').ok).toBe(true);
    expect(checkPluginFileName('a/b.md').ok).toBe(false);
    expect(checkPluginFileName('a\\b.md').ok).toBe(false);
    expect(checkPluginFileName('..').ok).toBe(false);
    expect(checkPluginFileName('.env').ok).toBe(false);
  });

  it('拼接路径与拒绝清单', () => {
    expect(joinPluginPath('/plugins/x/', 'skills')).toBe('/plugins/x/skills');
    expect(PLUGIN_DENY_SEGMENTS.length).toBeGreaterThan(0);
  });
});
