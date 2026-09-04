/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 小说正文 DSL ↔ ProseMirror JSON 序列化（06 篇 §1.1「内容序列化走 03 篇 DSL」）。
 *
 * 纯函数、无 DOM 依赖：操作 PM-JSON 普通对象，可无头单测。TipTap 编辑器（schema.ts）
 * 产出的 doc JSON 即此结构；正文（frontmatter 之后的部分）与 DSL 文本双向保真。
 *
 * 行级块：
 *   空行            → 段落分隔
 *   ***             → sceneBreak（场景分隔）
 *   # @role: value  → keywordLine（关键字声明/引用，与真标题以 @ 区分）
 *   #{1,3} text     → heading(level)
 *   其余连续行      → paragraph（段内软换行以 \n 保留）
 * 行内：
 *   [[tag]] / [[tag|显示]] → chapterRef（硬链接）
 *   {name} / {name|kind}   → placeholder（占位符）
 *
 * 富文本 marks（em/strong/typography）为编辑器态，不落 DSL（正文禁 Markdown 符号）。
 */

export interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

const KEYWORD_LINE = /^\s*#\s*@([\w-]+):\s*(.*)$/;
const HEADING = /^(#{1,3})\s+(.*)$/;
const SCENE_BREAK = /^\s*\*\*\*\s*$/;
const WIKI_INLINE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const PLACEHOLDER_INLINE = /\{([^{}|]+)(?:\|([^{}]+))?\}/g;

function textNode(t: string): PmNode {
  return { type: 'text', text: t };
}

/** 解析一段行内文本为 PM 内联节点序列（chapterRef / placeholder / text） */
function parseInline(line: string): PmNode[] {
  const out: PmNode[] = [];
  // 收集所有内联标记的匹配位置，按序切分
  type Hit = { start: number; end: number; node: PmNode };
  const hits: Hit[] = [];
  for (const m of line.matchAll(WIKI_INLINE)) {
    const start = m.index ?? 0;
    hits.push({
      start,
      end: start + m[0].length,
      node: { type: 'chapterRef', attrs: { tag: (m[1] ?? '').trim(), display: (m[2] ?? '').trim() || null } },
    });
  }
  for (const m of line.matchAll(PLACEHOLDER_INLINE)) {
    const start = m.index ?? 0;
    hits.push({
      start,
      end: start + m[0].length,
      node: { type: 'placeholder', attrs: { name: (m[1] ?? '').trim(), kind: (m[2] ?? '').trim() || null } },
    });
  }
  hits.sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const h of hits) {
    if (h.start < cursor) continue; // 与前一标记重叠（如 [[a{b]] 内部的花括号）——跳过
    if (h.start > cursor) out.push(textNode(line.slice(cursor, h.start)));
    out.push(h.node);
    cursor = h.end;
  }
  if (cursor < line.length) out.push(textNode(line.slice(cursor)));
  return out.length > 0 ? out : [textNode('')];
}

function paragraphFromLines(lines: string[]): PmNode {
  const joined = lines.join('\n');
  // 段内软换行：拆成多个内联序列，段间插入 hardBreak
  const segments = joined.split('\n');
  const content: PmNode[] = [];
  segments.forEach((seg, i) => {
    if (i > 0) content.push({ type: 'hardBreak' });
    content.push(...parseInline(seg));
  });
  return { type: 'paragraph', content };
}

/** DSL 正文文本 → PM doc JSON */
export function dslToPmDoc(body: string): PmNode {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: PmNode[] = [];
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length > 0) {
      blocks.push(paragraphFromLines(paraBuf));
      paraBuf = [];
    }
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flushPara();
      continue;
    }
    if (SCENE_BREAK.test(line)) {
      flushPara();
      blocks.push({ type: 'sceneBreak' });
      continue;
    }
    const kw = line.match(KEYWORD_LINE);
    if (kw) {
      flushPara();
      blocks.push({ type: 'keywordLine', attrs: { keyword: kw[1] ?? '', value: (kw[2] ?? '').trim() } });
      continue;
    }
    const head = line.match(HEADING);
    if (head) {
      flushPara();
      blocks.push({ type: 'heading', attrs: { level: (head[1] ?? '#').length }, content: parseInline((head[2] ?? '').trim()) });
      continue;
    }
    paraBuf.push(line);
  }
  flushPara();

  if (blocks.length === 0) blocks.push({ type: 'paragraph' });
  return { type: 'doc', content: blocks };
}

function renderInline(nodes: PmNode[] | undefined): string {
  if (!nodes) return '';
  let s = '';
  for (const n of nodes) {
    if (n.type === 'text') s += n.text ?? '';
    else if (n.type === 'hardBreak') s += '\n';
    else if (n.type === 'chapterRef') {
      const tag = String(n.attrs?.tag ?? '');
      const display = n.attrs?.display ? String(n.attrs.display) : '';
      s += display ? `[[${tag}|${display}]]` : `[[${tag}]]`;
    } else if (n.type === 'placeholder') {
      const name = String(n.attrs?.name ?? '');
      const kind = n.attrs?.kind ? String(n.attrs.kind) : '';
      s += kind ? `{${name}|${kind}}` : `{${name}}`;
    }
  }
  return s;
}

/** PM doc JSON → DSL 正文文本（块间以空行分隔，与 dslToPmDoc 往返稳定） */
export function pmDocToDsl(doc: PmNode): string {
  const blocks = doc.content ?? [];
  const lines: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'paragraph':
        lines.push(renderInline(b.content));
        lines.push('');
        break;
      case 'heading': {
        const level = Number(b.attrs?.level ?? 1);
        lines.push('#'.repeat(Math.min(3, Math.max(1, level))) + ' ' + renderInline(b.content));
        lines.push('');
        break;
      }
      case 'sceneBreak':
        lines.push('***');
        lines.push('');
        break;
      case 'keywordLine':
        lines.push(`# @${b.attrs?.keyword ?? ''}: ${b.attrs?.value ?? ''}`.trimEnd());
        lines.push('');
        break;
      default:
        // 未知块：尽力渲染其内联内容
        if (b.content) {
          lines.push(renderInline(b.content));
          lines.push('');
        }
    }
  }
  // 去掉尾部多余空行，保留单个结尾换行
  return lines.join('\n').replace(/\n+$/, '') + '\n';
}
