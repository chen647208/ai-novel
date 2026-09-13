/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it } from 'vitest';

import { applyProofreadFixes, autoFormatContent, findProofreadIssues } from '../services/writingToolsService';

describe('writingToolsService', () => {
  it('检出常见错别字与重复标点', () => {
    const issues = findProofreadIssues('他登陆了账号。。真的的很好');
    expect(issues.map((issue) => issue.suggestion)).toEqual(expect.arrayContaining(['登录', '。', '的']));
  });

  it('全部修正后文本无残留问题', () => {
    const text = '他登陆了账号。。';
    const fixed = applyProofreadFixes(text, findProofreadIssues(text));
    expect(fixed).toBe('他登录了账号。');
  });

  it('一键排版合并空行并规范省略号', () => {
    const formatted = autoFormatContent('第一段……  \n\n\n\n第二段...');
    expect(formatted).toBe('第一段……\n\n第二段……');
  });

  it('可选的段落缩进跳过标题与场景行', () => {
    const formatted = autoFormatContent('# 标题\n正文', { indentParagraphs: true });
    expect(formatted).toBe('# 标题\n　　正文');
  });
});
