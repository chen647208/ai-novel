/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import {
  DEFAULT_KEYBINDINGS,
  eventToKeybinding,
  findConflicts,
  formatKeybinding,
  resolveKeybindings,
} from '../keybindings';

describe('eventToKeybinding', () => {
  it('Ctrl/Cmd 组合序列化，无修饰返回 null', () => {
    expect(eventToKeybinding({ ctrlKey: true, metaKey: false, key: 'j' })).toBe('ctrl+j');
    expect(eventToKeybinding({ ctrlKey: false, metaKey: true, key: 'F' })).toBe('ctrl+f');
    expect(eventToKeybinding({ ctrlKey: false, metaKey: false, key: 'j' })).toBeNull();
    expect(eventToKeybinding({ ctrlKey: true, metaKey: false, key: 'Control' })).toBeNull();
  });
});

describe('formatKeybinding', () => {
  it('mac ⌘，其余 Ctrl+大写', () => {
    expect(formatKeybinding('ctrl+j', true)).toBe('⌘J');
    expect(formatKeybinding('ctrl+f', false)).toBe('Ctrl+F');
  });
});

describe('findConflicts', () => {
  it('同串其他动作即冲突，自身除外', () => {
    const map = { toggleAssistant: 'ctrl+j', find: 'ctrl+j' };
    expect(findConflicts(map, 'find', 'ctrl+j')).toEqual(['toggleAssistant']);
    expect(findConflicts(map, 'find', 'ctrl+k')).toEqual([]);
  });
});

describe('resolveKeybindings', () => {
  it('缺席回退默认', () => {
    expect(resolveKeybindings({ find: 'ctrl+k' })).toEqual({ ...DEFAULT_KEYBINDINGS, find: 'ctrl+k' });
    expect(resolveKeybindings()).toEqual(DEFAULT_KEYBINDINGS);
  });
});
