/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * novelDsl —— 大纲 / 卡片正文 / prompt 区共用的 CodeMirror 6 语言。
 *
 * 语法与 `@core/dsl/keywords` 的解析器保持同源（关键字表、`# @kw:` 行、`[[链接]]`），
 * 这里只做「着色」，不做「校验」——引用是否命中由 tagValidation 扩展以波浪线呈现。
 *
 *   ---            顶部 frontmatter 块（成对 --- 之间）
 *   # 标题          Markdown 标题
 *   # @tag: 林渊 | 别名   关键字声明行（@ 前缀 + 关键字名 + 冒号）
 *   # @pov: 林渊, 苏雪    关键字引用行
 *   ***            场景分隔
 *   [[云都|云端帝都]]  wiki 硬链接
 *   {待填}          占位符
 *   @林渊           行内软标签
 */
import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { KEYWORD_ROLES, TAG_KEYWORD } from '@core/dsl/keywords';

/** 合法关键字名集合（tag + 各引用角色），供语言与校验共用。 */
export const DSL_KEYWORDS: ReadonlySet<string> = new Set([TAG_KEYWORD, ...Object.keys(KEYWORD_ROLES)]);

/** 行内软标签：@ + 2 个以上字母/数字/下划线/连字符（与 primitives.ts TAG_PATTERN 一致）。 */
const INLINE_TAG = /@[\p{L}\p{N}_-]{2,}/u;
/** 关键字行前缀：可选缩进 + # + 空格 + @keyword: */
const KEYWORD_PREFIX = /^\s*#\s*@([\w-]+):/;
/** 场景分隔：整行仅 *** */
const SCENE_BREAK = /^\s*\*\*\*\s*$/;

interface DslState {
  /** frontmatter 状态：0=顶部未定，1=块内，2=已结束/无 */
  fm: 0 | 1 | 2;
  /** 当前行是关键字行，正在扫描其值段 */
  kwValue: boolean;
}

export const novelDslLanguage = StreamLanguage.define<DslState>({
  name: 'novelDsl',
  startState: () => ({ fm: 0, kwValue: false }),
  copyState: (s) => ({ fm: s.fm, kwValue: s.kwValue }),
  token(stream, state) {
    // frontmatter 块内：整行 meta，直到闭合 ---
    if (state.fm === 1) {
      if (stream.sol() && stream.match('---', true)) {
        state.fm = 2;
        return 'meta';
      }
      stream.skipToEnd();
      return 'meta';
    }

    if (stream.sol()) {
      state.kwValue = false;
      // 仅文档最顶部允许 frontmatter 起始
      if (state.fm === 0) {
        if (stream.match('---', true)) {
          state.fm = 1;
          return 'meta';
        }
        state.fm = 2;
      }
      if (stream.match(SCENE_BREAK, true)) return 'separator';
      if (KEYWORD_PREFIX.test(stream.string)) {
        stream.match(/^\s*#\s*@[\w-]+:/, true);
        state.kwValue = true;
        return 'keyword';
      }
      if (stream.match(/^#{1,6}\s+/, true)) {
        stream.skipToEnd();
        return 'heading';
      }
    }

    // 关键字行的值段：整段作为字符串（别名/目标名）
    if (state.kwValue) {
      stream.skipToEnd();
      return 'string';
    }

    // 行内 token
    if (stream.eatSpace()) return null;
    if (stream.match(/\[\[[^\]]*\]\]/)) return 'link';
    if (stream.match(/\{[^}]*\}/)) return 'monospace';
    if (stream.match(INLINE_TAG)) return 'tagName';
    // 普通文本：吞到下一个特殊字符
    stream.eatWhile(/[^@[{]/);
    return null;
  },
  languageData: {
    commentTokens: { line: '#' },
  },
});

/** novelDsl 语法着色：映射到 CSS 变量，随明暗主题自适应。 */
export const novelDslHighlight = HighlightStyle.define([
  { tag: t.heading, class: 'cm-novel-heading', fontWeight: 'bold' },
  { tag: t.keyword, class: 'cm-novel-keyword' },
  { tag: t.string, class: 'cm-novel-value' },
  { tag: t.link, class: 'cm-novel-link' },
  { tag: t.meta, class: 'cm-novel-frontmatter' },
  { tag: t.separator, class: 'cm-novel-scenebreak' },
  { tag: t.tagName, class: 'cm-novel-tag' },
  { tag: t.monospace, class: 'cm-novel-placeholder' },
]);

/** 把着色装进一个可直接 spread 的扩展。 */
export function novelDslExtensions() {
  return [novelDslLanguage, syntaxHighlighting(novelDslHighlight)];
}
