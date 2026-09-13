/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { Chapter } from '@shared/types';
import { describe, expect, it } from 'vitest';

import { chaptersToFountain, parseFountain, screenplayToChapters, toFountain } from '../screenplayModel';

const SAMPLE = `Title: Test Script

INT. CAFE - DAY

The boy enters.

BOY
(quietly)
Hello.

CUT TO:
`;

describe('screenplayModel', () => {
  it('解析 Fountain 为元素序列', () => {
    const doc = parseFountain(SAMPLE);
    expect(doc.title).toBe('Test Script');
    expect(doc.elements.map((element) => element.type)).toEqual([
      'scene_heading',
      'action',
      'character',
      'parenthetical',
      'dialogue',
      'transition',
    ]);
    expect(doc.elements[2]?.text).toBe('BOY');
  });

  it('序列化后再次解析得到相同类型序列', () => {
    const doc = parseFountain(SAMPLE);
    const reparsed = parseFountain(toFountain(doc));
    expect(reparsed.elements.map((element) => element.type)).toEqual(doc.elements.map((element) => element.type));
    expect(reparsed.elements[4]?.text).toBe('Hello.');
  });

  it('每个场景标题切分一个章节', () => {
    const doc = parseFountain(SAMPLE);
    const chapters = screenplayToChapters(doc, (index) => `c${index}`);
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.title).toBe('INT. CAFE - DAY');
    expect(chapters[0]?.content).toContain('# @character: BOY');
  });

  it('章节导出为 Fountain 含场景标题与角色', () => {
    const chapters: Chapter[] = [
      { id: 'c1', title: 'INT. ROOM - NIGHT', summary: '', content: '# @character: ANNA\n（低语）\n我来了。', order: 0 },
    ];
    const text = chaptersToFountain(chapters, '导出');
    expect(text).toContain('Title: 导出');
    expect(text).toContain('INT. ROOM - NIGHT');
    expect(text).toContain('ANNA');
    expect(text).toContain('我来了。');
    const reparsed = parseFountain(text);
    expect(reparsed.elements.map((element) => element.type)).toEqual(['scene_heading', 'character', 'parenthetical', 'dialogue']);
  });
});
