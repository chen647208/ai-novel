/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { applySelectionReplacement,parseBody, serializeBody } from '../commands';

describe('editor commands', () => {
  it('parseBody→serializeBody 与 serialization 往返一致', () => {
    const content = '第一段。\n\n第二段。';
    expect(serializeBody(parseBody(content))).toBe(content);
  });

  it('替换选区文本（PM 位置区间）', () => {
    const content = '第一段。\n\n第二段。';
    // 首段文字「第一段。」占 doc 位置 [1,5)
    const out = applySelectionReplacement(content, 1, 5, '替换段');
    expect(out).toContain('替换段');
    expect(out).toContain('第二段');
    expect(out).not.toContain('第一段');
  });

  it('空选区在光标处插入（块级替换按段落切分，AI 输出成独立段）', () => {
    const out = applySelectionReplacement('开头结尾', 2, 2, '中间');
    expect(out).toBe('开\n\n中间\n\n头结尾');
  });

  it('越界位置被夹取，不抛错', () => {
    expect(() => applySelectionReplacement('短', 0, 9999, '替换')).not.toThrow();
    expect(applySelectionReplacement('短', 0, 9999, '替换')).toContain('替换');
  });

  it('多段替换结果仍为合法 DSL（可再解析）', () => {
    const out = applySelectionReplacement('原段落。\n\n另一段。', 1, 4, '新头\n新尾');
    expect(() => parseBody(out)).not.toThrow();
  });
});
