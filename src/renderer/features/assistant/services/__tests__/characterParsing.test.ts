/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { parseSingleCharacterFromText } from '../characterParsing';

describe('parseSingleCharacterFromText', () => {
  it('空文本返回 null', () => {
    expect(parseSingleCharacterFromText('')).toBeNull();
  });

  it('识别姓名/性别/角色类型并归一化枚举', () => {
    const parsed = parseSingleCharacterFromText('角色名：林川\n性别：男\n角色类型：主角\n性格：冷静');
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe('林川');
    expect(parsed?.gender).toBe('male');
    expect(parsed?.role).toBe('protagonist');
    expect(parsed?.personality).toBe('冷静');
  });

  it('无姓名时返回 null', () => {
    expect(parseSingleCharacterFromText('性别：女\n性格：活泼')).toBeNull();
  });
});
