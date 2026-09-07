/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { SECTION_FEATURE, isSectionVisible } from '../sectionFeatures';

describe('sectionFeatures', () => {
  it('五分区映射齐全', () => {
    expect(Object.keys(SECTION_FEATURE).sort()).toEqual(
      ['characters', 'inspiration', 'structure', 'writing', 'world'].sort(),
    );
  });

  it('structure 任一子功能可用即显', () => {
    expect(isSectionVisible('structure', (id) => id === 'core.outline')).toBe(true);
    expect(isSectionVisible('structure', (id) => id === 'core.chapters')).toBe(true);
    expect(isSectionVisible('structure', () => false)).toBe(false);
  });

  it('其余分区直取映射', () => {
    expect(isSectionVisible('writing', (id) => id === 'core.writing')).toBe(true);
    expect(isSectionVisible('writing', () => false)).toBe(false);
  });
});
