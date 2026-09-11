/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { parseCharactersFromText } from '../characterListParsing';

describe('parseCharactersFromText', () => {
  it('解析多个角色并归一化枚举', () => {
    const text = [
      '角色名：林川',
      '性别：男',
      '角色类型：主角',
      '性格：冷静',
      '',
      '姓名：苏婉',
      '性别：女',
      '定位：反派',
    ].join('\n');
    const out = parseCharactersFromText(text);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: '林川', gender: 'male', role: 'protagonist', personality: '冷静' });
    expect(out[1]).toMatchObject({ name: '苏婉', gender: 'female', role: 'antagonist' });
  });

  it('无角色名返回空数组', () => {
    expect(parseCharactersFromText('性别：男\n性格：冷静')).toEqual([]);
  });

  it('后续无字段行并入上一字段', () => {
    const out = parseCharactersFromText('角色名：甲\n性格：冷\n静如止水');
    expect(out[0]!.personality).toBe('冷 静如止水');
  });
});
