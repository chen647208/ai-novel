/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it, vi } from 'vitest';

import { emitEditorOps, MAX_EDITOR_OP_TEXT,MAX_EDITOR_OPS, onEditorOps, validateEditorOps } from '../editorOps';

describe('editorOps（design/22 §4 编辑器操作白名单）', () => {
  it('只保留白名单内的合法操作', () => {
    const ops = validateEditorOps([
      { kind: 'replaceSelection', text: 'a' },
      { kind: 'execShell', text: 'rm -rf' },
      { kind: 'replaceSelection', text: 123 },
      'nope',
    ]);
    expect(ops).toEqual([{ kind: 'replaceSelection', text: 'a' }]);
  });

  it('超长文本与超量操作被拒', () => {
    expect(validateEditorOps([{ kind: 'replaceSelection', text: 'x'.repeat(MAX_EDITOR_OP_TEXT + 1) }])).toEqual([]);
    const many = Array.from({ length: MAX_EDITOR_OPS + 5 }, () => ({ kind: 'replaceSelection', text: 'x' }));
    expect(validateEditorOps(many)).toHaveLength(MAX_EDITOR_OPS);
  });

  it('非数组返回空', () => {
    expect(validateEditorOps('nope')).toEqual([]);
  });

  it('总线派发与解绑', () => {
    const handler = vi.fn();
    const unsub = onEditorOps(handler);
    emitEditorOps([{ kind: 'replaceSelection', text: 'hi' }]);
    expect(handler).toHaveBeenCalledWith([{ kind: 'replaceSelection', text: 'hi' }]);
    unsub();
    emitEditorOps([{ kind: 'replaceSelection', text: 'again' }]);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
