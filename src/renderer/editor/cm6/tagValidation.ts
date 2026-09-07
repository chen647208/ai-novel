/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * @tag 引用校验 —— 对未命中索引标签的引用打波浪线（novelWriter 编辑器体验）。
 *
 * 校验三类引用：
 *   1. 关键字引用行 `# @pov: 林渊, 苏雪` 的逗号分隔目标（`# @tag:` 声明行除外）
 *   2. wiki 硬链接 `[[云都]]` / `[[云都|别名]]` 的目标段
 *   3. 行内软标签 `@林渊`
 *
 * `collectTagDiagnostics` 是纯函数（文本 + 合法标签集 → 诊断），便于单测；
 * `tagValidation` 把它包成 CodeMirror linter 扩展，延迟重算。
 */
import { linter, forceLinting, type Diagnostic } from '@codemirror/lint';
import { ViewPlugin, type EditorView } from '@codemirror/view';
import { DSL_KEYWORDS } from './novelDsl';

export interface TagDiagnostic {
  from: number;
  to: number;
  message: string;
}

const KEYWORD_LINE = /^(\s*#\s*@)([\w-]+)(:)(.*)$/;
const WIKI_LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const INLINE_TAG = /@([\p{L}\p{N}_-]{2,})/gu;

/** 扫描文本，返回引用了 `validTags` 之外标签的区间诊断（偏移为整篇文档坐标）。 */
export function collectTagDiagnostics(text: string, validTags: Set<string>): TagDiagnostic[] {
  const out: TagDiagnostic[] = [];
  let lineStart = 0;
  for (const line of text.split('\n')) {
    const lineEnd = lineStart + line.length;
    const km = KEYWORD_LINE.exec(line);
    if (km) {
      const keyword = km[2] ?? '';
      const value = km[4] ?? '';
      // 声明行（@tag:）与未知关键字不校验
      if (keyword !== 'tag' && DSL_KEYWORDS.has(keyword)) {
        const valueStart = lineStart + line.length - value.length;
        let idx = 0;
        for (const seg of value.split(',')) {
          const lead = seg.length - seg.trimStart().length;
          const name = seg.trim();
          if (name && !validTags.has(name)) {
            const from = valueStart + idx + lead;
            out.push({ from, to: from + name.length, message: `未定义的标签引用「${name}」` });
          }
          idx += seg.length + 1; // 逗号
        }
      }
      lineStart = lineEnd + 1;
      continue; // 关键字行不再走行内扫描，避免把 @pov 误判为软标签
    }

    // wiki 硬链接
    WIKI_LINK.lastIndex = 0;
    let wm: RegExpExecArray | null;
    while ((wm = WIKI_LINK.exec(line)) !== null) {
      const tag = (wm[1] ?? '').trim();
      if (tag && !validTags.has(tag)) {
        const from = lineStart + wm.index + 2; // 跳过 [[
        out.push({ from, to: from + tag.length, message: `未定义的链接目标「${tag}」` });
      }
    }

    // 行内软标签
    INLINE_TAG.lastIndex = 0;
    let im: RegExpExecArray | null;
    while ((im = INLINE_TAG.exec(line)) !== null) {
      const tag = im[1] ?? '';
      if (tag && !validTags.has(tag)) {
        const from = lineStart + im.index + 1; // 跳过 @
        out.push({ from, to: from + tag.length, message: `未定义的标签「${tag}」` });
      }
    }

    lineStart = lineEnd + 1;
  }
  return out;
}

/** 挂载后主动跑一次 lint：linter 只在 docChanged 时重算，受控 value 初始写入不触发。 */
function lintOnMount() {
  return ViewPlugin.define((view: EditorView) => {
    const id = setTimeout(() => {
      try {
        void forceLinting(view);
      } catch {
        /* 视图可能已卸载 */
      }
    }, 60);
    return { destroy: () => clearTimeout(id) };
  });
}

/** CodeMirror 扩展：把校验接成 linter，输入停顿 300ms 后重算波浪线，并在挂载时先跑一次。 */
export function tagValidation(validTags: () => Set<string>) {
  return [
    linter(
      (view): Diagnostic[] =>
        collectTagDiagnostics(view.state.doc.toString(), validTags()).map(
          (d): Diagnostic => ({ from: d.from, to: d.to, severity: 'warning', message: d.message }),
        ),
      { delay: 300 },
    ),
    lintOnMount(),
  ];
}
