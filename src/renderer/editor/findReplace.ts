/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 查找替换纯函数（docs/design/06 编辑器）：PM 文档内文本块扫匹配，
 * 返回文档坐标；替换由调用方经 view.dispatch 落事务。
 * 当前匹配即用选区高亮（不另建 Decoration 插件）。
 */
import type { Node as PMNode } from '@tiptap/pm/model';

export interface TextMatch {
  from: number;
  to: number;
}

export function findMatches(doc: PMNode, query: string, caseSensitive = false): TextMatch[] {
  const q = query.trim();
  if (!q) return [];
  const needle = caseSensitive ? q : q.toLowerCase();
  const out: TextMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    const hay = caseSensitive ? node.text : node.text.toLowerCase();
    let i = hay.indexOf(needle);
    while (i !== -1) {
      out.push({ from: pos + i, to: pos + i + q.length });
      i = hay.indexOf(needle, i + 1);
    }
    return true;
  });
  return out;
}
