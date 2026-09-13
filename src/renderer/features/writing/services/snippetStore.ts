/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 快捷词库：本地持久化的可插入片段。 */
import { STORAGE_KEYS } from '@shared/constants/storageKeys';

import { localStore } from '@/shared/services/localStore';

export interface Snippet {
  id: string;
  label: string;
  text: string;
}

export function readSnippets(): Snippet[] {
  try {
    const raw = localStore.getItem(STORAGE_KEYS.editorSnippets);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Snippet =>
        typeof item === 'object' && item !== null &&
        typeof (item as Snippet).id === 'string' &&
        typeof (item as Snippet).label === 'string' &&
        typeof (item as Snippet).text === 'string',
    );
  } catch {
    return [];
  }
}

export function saveSnippets(snippets: Snippet[]): void {
  localStore.setItem(STORAGE_KEYS.editorSnippets, JSON.stringify(snippets));
}

export function createSnippet(label: string, text: string): Snippet {
  return { id: `snippet:${crypto.randomUUID()}`, label, text };
}
