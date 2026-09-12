/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 编辑器操作总线（design/22 §4）：插件 iframe 只能"请求"受控操作，
 * 宿主校验（白名单 + 长度上限）后由写作编辑器订阅并应用到事务管线。
 */

export type EditorOp = { kind: 'replaceSelection'; text: string };

/** 单条操作文本上限。 */
export const MAX_EDITOR_OP_TEXT = 10_000;
/** 单次请求操作数上限。 */
export const MAX_EDITOR_OPS = 32;

/** 校验并裁剪 iframe 请求的操作：只保留白名单内的合法操作。 */
export function validateEditorOps(raw: unknown): EditorOp[] {
  if (!Array.isArray(raw)) return [];
  const out: EditorOp[] = [];
  for (const item of raw.slice(0, MAX_EDITOR_OPS)) {
    if (!item || typeof item !== 'object') continue;
    const op = item as { kind?: unknown; text?: unknown };
    if (op.kind !== 'replaceSelection' || typeof op.text !== 'string') continue;
    if (op.text.length > MAX_EDITOR_OP_TEXT) continue;
    out.push({ kind: 'replaceSelection', text: op.text });
  }
  return out;
}

type Handler = (ops: EditorOp[]) => void;
const handlers = new Set<Handler>();

/** 订阅操作请求；返回解绑函数。 */
export function onEditorOps(handler: Handler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

/** 派发操作请求（宿主侧已校验）。 */
export function emitEditorOps(ops: EditorOp[]): void {
  for (const handler of handlers) handler(ops);
}
