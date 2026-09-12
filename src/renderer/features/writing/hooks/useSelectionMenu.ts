/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 写作区选区浮动菜单（从 WritingEditor 抽出）：鼠标/键盘选中文本后定位菜单。
 * 纯 UI 状态，不碰章节数据。
 */
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';

import { SELECTION_MENU_DEBOUNCE_MS } from '../constants';
import type { MenuPosition, NovelEditorHandle, TextSelectionRange } from '../types';
import { debounce, getFloatingMenuPosition } from '../utils';

export interface SelectionMenuController {
  menuPos: MenuPosition | null;
  setMenuPos: React.Dispatch<React.SetStateAction<MenuPosition | null>>;
  selectedText: string;
  setSelectedText: React.Dispatch<React.SetStateAction<string>>;
  selectionRange: TextSelectionRange | null;
  setSelectionRange: React.Dispatch<React.SetStateAction<TextSelectionRange | null>>;
  applySelectionMenu: (text: string, range: TextSelectionRange, x: number, y: number) => void;
  clearSelectionMenu: () => void;
  handleMouseSelect: (event: React.MouseEvent) => void;
  handleKeySelect: () => void;
  handleMouseMove: (event: React.MouseEvent) => void;
}

export function useSelectionMenu(
  editorRef: React.RefObject<NovelEditorHandle | null>,
  selectionBlocked: boolean,
): SelectionMenuController {
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<TextSelectionRange | null>(null);

  const applySelectionMenu = useCallback((text: string, range: TextSelectionRange, x: number, y: number) => {
    setMenuPos(getFloatingMenuPosition(x, y));
    setSelectedText(text);
    setSelectionRange(range);
  }, []);

  const clearSelectionMenu = useCallback(() => {
    setMenuPos(null);
    setSelectedText('');
    setSelectionRange(null);
  }, []);

  const handleMouseSelect = useCallback(
    (event: React.MouseEvent) => {
      const handle = editorRef.current;
      if (!handle || selectionBlocked) return;
      const snapshot = handle.getSelection();
      if (!snapshot) {
        clearSelectionMenu();
        return;
      }
      applySelectionMenu(snapshot.text, snapshot.range, event.clientX, event.clientY);
    },
    [applySelectionMenu, clearSelectionMenu, editorRef, selectionBlocked],
  );

  const handleKeySelect = useCallback(() => {
    const handle = editorRef.current;
    if (!handle || selectionBlocked) return;
    const snapshot = handle.getSelection();
    if (!snapshot) {
      clearSelectionMenu();
      return;
    }
    const anchor = handle.getKeyboardSelectionMenuPosition();
    if (anchor) setMenuPos(getFloatingMenuPosition(anchor.x, anchor.y));
    setSelectedText(snapshot.text);
    setSelectionRange(snapshot.range);
  }, [clearSelectionMenu, editorRef, selectionBlocked]);

  const handleMouseMove = useMemo(
    () =>
      debounce((event: React.MouseEvent) => {
        const handle = editorRef.current;
        if (selectionBlocked || !handle) return;
        const snapshot = handle.getSelection();
        if (!snapshot) {
          setMenuPos((prev) => (prev ? null : prev));
          return;
        }
        applySelectionMenu(snapshot.text, snapshot.range, event.clientX, event.clientY);
      }, SELECTION_MENU_DEBOUNCE_MS),
    [applySelectionMenu, editorRef, selectionBlocked],
  );

  return {
    menuPos,
    setMenuPos,
    selectedText,
    setSelectedText,
    selectionRange,
    setSelectionRange,
    applySelectionMenu,
    clearSelectionMenu,
    handleMouseSelect,
    handleKeySelect,
    handleMouseMove,
  };
}
