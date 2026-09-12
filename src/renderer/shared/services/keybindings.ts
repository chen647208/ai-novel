/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 快捷键纯函数（docs/design/15）：事件序列化、冲突检测。 */

import type { KeybindingActionId } from '../../../shared/types';

export type { KeybindingActionId };

export type KeybindingMap = Partial<Record<KeybindingActionId, string>>;

/** 默认绑定（与历史硬编码一致，改键只改配置）。 */
export const DEFAULT_KEYBINDINGS: Record<KeybindingActionId, string> = {
  toggleAssistant: 'ctrl+j',
  section1: 'ctrl+1',
  section2: 'ctrl+2',
  section3: 'ctrl+3',
  section4: 'ctrl+4',
  section5: 'ctrl+5',
  find: 'ctrl+f',
};

/** KeyboardEvent → 规范串（ctrl+/ 或 meta+/cmd+ 前缀，小写单键）。 */
export function eventToKeybinding(e: { ctrlKey: boolean; metaKey: boolean; key: string }): string | null {
  if (!e.ctrlKey && !e.metaKey) return null;
  const key = e.key.toLowerCase();
  // 修饰键自身不算快捷键
  if (['control', 'meta', 'shift', 'alt'].includes(key)) return null;
  return `ctrl+${key}`;
}

/** 展示串（mac 显示 ⌘，其余 Ctrl+大写）。 */
export function formatKeybinding(binding: string, isMac: boolean): string {
  const key = binding.replace(/^ctrl\+/i, '');
  const upper = key.length === 1 ? key.toUpperCase() : key;
  return isMac ? `⌘${upper}` : `Ctrl+${upper}`;
}

/** 冲突检测：返回与目标串相同的其他动作 id 列表。 */
export function findConflicts(map: KeybindingMap, action: KeybindingActionId, binding: string): KeybindingActionId[] {
  return (Object.keys(map) as KeybindingActionId[]).filter((a) => a !== action && map[a] === binding);
}

/** 合并用户配置与默认（缺席回退默认）。 */
export function resolveKeybindings(custom?: KeybindingMap): Record<KeybindingActionId, string> {
  return { ...DEFAULT_KEYBINDINGS, ...custom };
}
