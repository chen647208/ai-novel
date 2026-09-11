/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import type { Character } from '../../../../shared/types';
import { buildCharacterCardMarkdown } from '../characterCard';

const character = (over: Partial<Character> = {}): Character => ({
  id: 'c1',
  name: '张三',
  gender: 'male',
  age: '24',
  role: 'protagonist',
  personality: '冷静',
  background: '孤儿',
  relationships: '',
  appearance: '',
  distinctiveFeatures: '',
  occupation: '剑客',
  motivation: '复仇',
  strengths: '',
  weaknesses: '',
  characterArc: '',
  ...over,
});

describe('buildCharacterCardMarkdown', () => {
  it('标题、书名与角色/性别本地化标签', () => {
    const md = buildCharacterCardMarkdown(character(), '雾港');
    expect(md).toContain('# 张三');
    expect(md).toContain('雾港');
    expect(md).toContain('主角');
    expect(md).toContain('男');
  });

  it('空字段不落，非空字段保留', () => {
    const md = buildCharacterCardMarkdown(character(), '雾港');
    expect(md).toContain('**职业/身份**：剑客');
    expect(md).not.toContain('**弱点/缺陷**');
    expect(md).not.toContain('**成长弧线**');
  });
});
