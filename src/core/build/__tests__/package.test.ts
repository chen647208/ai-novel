/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import { buildDocxFiles, buildEpubFiles, htmlToDocxParagraphs } from '../package.js';

const input = {
  title: '雾港来信',
  intro: '潮水漫过石阶。',
  htmlBody: '<h1>第一章</h1><p>林渊推门。</p><p>雨很大 & 很吵。</p>',
};

describe('buildEpubFiles', () => {
  it('四件套齐全且 opf 指向存在', () => {
    const files = buildEpubFiles(input);
    expect(Object.keys(files).sort()).toEqual([
      'META-INF/container.xml',
      'OEBPS/content.opf',
      'OEBPS/content.xhtml',
      'mimetype',
    ]);
    expect(files['mimetype']).toBe('application/epub+zip');
    expect(files['OEBPS/content.opf']).toContain('content.xhtml');
    expect(files['OEBPS/content.xhtml']).toContain('雾港来信');
    expect(files['OEBPS/content.xhtml']).toContain('林渊推门');
  });

  it('空标题回退 Untitled', () => {
    const files = buildEpubFiles({ title: '', htmlBody: '<p>x</p>' });
    expect(files['OEBPS/content.xhtml']).toContain('Untitled');
  });
});

describe('htmlToDocxParagraphs', () => {
  it('h1/h2/p 映射标题级别', () => {
    expect(htmlToDocxParagraphs('<h1>卷一</h1><h2>第一章</h2><p>正文</p>')).toEqual([
      { text: '卷一', heading: 1 },
      { text: '第一章', heading: 2 },
      { text: '正文', heading: 0 },
    ]);
  });

  it('去标记转义实体', () => {
    expect(htmlToDocxParagraphs('<p>a<br>b &amp; c</p>')).toEqual([
      { text: 'a', heading: 0 },
      { text: 'b & c', heading: 0 },
    ]);
  });

  it('纯文本按空行分段兜底', () => {
    expect(htmlToDocxParagraphs('第一段\n\n第二段')).toEqual([
      { text: '第一段', heading: 0 },
      { text: '第二段', heading: 0 },
    ]);
  });
});

describe('buildDocxFiles', () => {
  it('三件套齐全且标题进 Heading1', () => {
    const files = buildDocxFiles(input);
    expect(Object.keys(files).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
    ]);
    expect(files['word/document.xml']).toContain('<w:pStyle w:val="Heading1"/>');
    expect(files['word/document.xml']).toContain('雾港来信');
    expect(files['word/document.xml']).toContain('&amp;');
    expect(files['word/document.xml']).not.toContain('<p>');
  });
});
