/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { Project } from '@shared/types';
import { describe, expect, it } from 'vitest';

import { buildMirrorFiles, sanitizeFileName } from '../mirrorService';

function makeProject(): Project {
  return {
    id: 'p1',
    title: '我的/书',
    inspiration: '',
    intro: '',
    outline: '',
    virtualChapters: [],
    knowledge: [],
    characters: [],
    lastModified: 0,
    chapters: [
      { id: 'c2', title: '第二章', summary: '', content: '正文二', order: 1 },
      { id: 'c1', title: '第一:章', summary: '', content: '正文一', order: 0 },
    ],
  };
}

describe('mirrorService', () => {
  it('清理文件名非法字符', () => {
    expect(sanitizeFileName('a/b:c*?')).toBe('a_b_c__');
    expect(sanitizeFileName('   ')).toBe('untitled');
  });

  it('按 order 生成章节 Markdown 与元数据', () => {
    const files = buildMirrorFiles(makeProject(), new Date('2026-01-01T00:00:00.000Z'));
    expect(files.map((file) => file.path)).toEqual([
      'project.json',
      'meta.json',
      'chapters/001-第一_章.md',
      'chapters/002-第二章.md',
    ]);
    expect(files[2]?.content).toContain('# 第一:章');
    expect(files[2]?.content).toContain('正文一');
    expect(files[1]?.content).toContain('"chapters": 2');
  });
});
