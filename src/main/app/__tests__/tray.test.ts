/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { shouldHideOnClose } from '../tray.js';

describe('shouldHideOnClose', () => {
  it('缺席即最小化到托盘，显式关闭则真关，退出流程一律放行', () => {
    expect(shouldHideOnClose({}, false)).toBe(true);
    expect(shouldHideOnClose({ minimizeToTray: true }, false)).toBe(true);
    expect(shouldHideOnClose({ minimizeToTray: false }, false)).toBe(false);
    expect(shouldHideOnClose({}, true)).toBe(false);
    expect(shouldHideOnClose({ minimizeToTray: true }, true)).toBe(false);
  });
});
