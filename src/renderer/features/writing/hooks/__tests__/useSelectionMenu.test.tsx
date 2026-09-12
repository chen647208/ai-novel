/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

// @vitest-environment jsdom


import { act,renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { NovelEditorHandle } from '../../types';
import { useSelectionMenu } from '../useSelectionMenu';

function fakeHandle(
  selection: { text: string; range: { from: number; to: number } } | null,
  keyboardAnchor: { x: number; y: number } | null = null,
): NovelEditorHandle {
  return {
    getSelection: () => selection,
    getKeyboardSelectionMenuPosition: () => keyboardAnchor,
  } as unknown as NovelEditorHandle;
}

function refOf(handle: NovelEditorHandle): React.RefObject<NovelEditorHandle | null> {
  return { current: handle };
}

describe('useSelectionMenu', () => {
  it('鼠标选中：定位菜单并记录文本/范围', () => {
    const handle = fakeHandle({ text: 'abc', range: { from: 1, to: 4 } });
    const { result } = renderHook(() => useSelectionMenu(refOf(handle), false));

    act(() => {
      result.current.handleMouseSelect({ clientX: 12, clientY: 34 } as React.MouseEvent);
    });
    expect(result.current.selectedText).toBe('abc');
    expect(result.current.selectionRange).toEqual({ from: 1, to: 4 });
    expect(result.current.menuPos).not.toBeNull();
  });

  it('无选中：清空菜单', () => {
    const handle = fakeHandle(null);
    const { result } = renderHook(() => useSelectionMenu(refOf(handle), false));
    act(() => {
      result.current.handleMouseSelect({ clientX: 1, clientY: 2 } as React.MouseEvent);
    });
    expect(result.current.menuPos).toBeNull();
    expect(result.current.selectedText).toBe('');
  });

  it('selectionBlocked 时不响应', () => {
    const handle = fakeHandle({ text: 'abc', range: { from: 1, to: 4 } });
    const { result } = renderHook(() => useSelectionMenu(refOf(handle), true));
    act(() => {
      result.current.handleMouseSelect({ clientX: 1, clientY: 2 } as React.MouseEvent);
    });
    expect(result.current.menuPos).toBeNull();
  });

  it('键盘选中：使用键盘锚点定位', () => {
    const handle = fakeHandle({ text: 'xyz', range: { from: 0, to: 3 } }, { x: 50, y: 60 });
    const { result } = renderHook(() => useSelectionMenu(refOf(handle), false));
    act(() => {
      result.current.handleKeySelect();
    });
    expect(result.current.selectedText).toBe('xyz');
    expect(result.current.menuPos).not.toBeNull();
  });
});
