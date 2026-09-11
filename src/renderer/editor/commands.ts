/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 编辑器命令辅助（06 篇 §1.3 单一事务管线的纯函数侧）。
 *
 * 用 getSchema 无头构建 PM schema，把「正文 DSL 文本 ↔ PM doc ↔ 选区替换」做成不依赖
 * DOM/EditorView 的纯函数，供 TipTapCanvas 与编排层复用，并可无头单测。
 */

import { getSchema } from '@tiptap/core';
import { Transform } from '@tiptap/pm/transform';

import { createNovelExtensions } from './schema';
import { dslToPmDoc, pmDocToDsl, type PmNode } from './serialization';

const schema = getSchema(createNovelExtensions());

/** DSL 正文文本 → PM doc 节点 */
export function parseBody(content: string) {
  return schema.nodeFromJSON(dslToPmDoc(content));
}

/** PM doc 节点 → DSL 正文文本 */
export function serializeBody(doc: ReturnType<typeof parseBody>): string {
  return pmDocToDsl(doc.toJSON() as PmNode);
}

/**
 * 在正文的 PM 位置区间 [from,to) 用 replacement 文本替换，返回替换后的 DSL 文本。
 * from/to 由编辑器选区给出（编辑器 doc 与 parseBody(content) 结构一致，位置可对齐）。
 * 纯计算、不触碰编辑器实例：编排层据此得到新 content，再经 React 状态回流驱动编辑器。
 */
export function applySelectionReplacement(content: string, from: number, to: number, replacement: string): string {
  const doc = parseBody(content);
  const safeFrom = Math.max(0, Math.min(from, doc.content.size));
  const safeTo = Math.max(safeFrom, Math.min(to, doc.content.size));
  const rep = dslToPmDoc(replacement);
  const nodes = (rep.content ?? []).map((n) => schema.nodeFromJSON(n));
  const tr = new Transform(doc);
  tr.replaceWith(safeFrom, safeTo, nodes);
  return pmDocToDsl(tr.doc.toJSON() as PmNode);
}
