/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * DSL frontmatter —— YAML 最小子集（key: value / 内联列表 [a, b] / 块列表 - item）。
 * 只覆盖小说文件头需要的能力：标量、字符串列表。多行文本一律放正文。
 * parse/serialize 对“规范形式”严格往返（serialize(parse(serialize(x))) === serialize(x)）。
 */

export type FrontmatterValue = string | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

const FM_DELIMITER = '---';

/** 值是否需要加引号（含特殊字符时） */
function needsQuote(s: string): boolean {
  return /^[\s[\]#>|&*!%@`"']/.test(s) || /[:#]\s|\s#|^$/.test(s) || s.includes('"');
}

function quote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return s;
}

/** 解析内联列表 `[a, b]`；失败返回 null */
function parseInlineList(s: string): string[] | null {
  if (!s.startsWith('[') || !s.endsWith(']')) return null;
  const inner = s.slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(',').map((item) => unquote(item.trim())).filter((item) => item.length > 0);
}

/**
 * 解析文件头。返回 { frontmatter, body }；无 frontmatter 时 frontmatter 为空对象。
 * 容错：非法行跳过（编辑器实时解析场景不能因一行坏数据全盘失败）。
 */
export function parseFrontmatter(text: string): { frontmatter: Frontmatter; body: string } {
  const lines = text.split('\n');
  if (lines[0]?.trim() !== FM_DELIMITER) {
    return { frontmatter: {}, body: text };
  }
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === FM_DELIMITER);
  if (endIdx < 0) {
    return { frontmatter: {}, body: text }; // 未闭合 → 视为无 frontmatter
  }
  const frontmatter: Frontmatter = {};
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i] ?? '';
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][\w.-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1] ?? '';
    const rawVal = (m[2] ?? '').trim();
    if (rawVal === '') {
      // 块列表：后续 "- item" 行
      const items: string[] = [];
      while (i + 1 < endIdx && /^\s*-\s+/.test(lines[i + 1] ?? '')) {
        i += 1;
        items.push(unquote((lines[i] ?? '').replace(/^\s*-\s+/, '').trim()));
      }
      frontmatter[key] = items;
    } else {
      const inline = parseInlineList(rawVal);
      frontmatter[key] = inline ?? unquote(rawVal);
    }
  }
  const body = lines.slice(endIdx + 1).join('\n');
  return { frontmatter, body };
}

/** 序列化为规范形式（键按插入序；列表用内联 [a, b]） */
export function serializeFrontmatter(fm: Frontmatter): string {
  const entries = Object.entries(fm).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  const lines = [FM_DELIMITER];
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => (needsQuote(v) ? quote(v) : v)).join(', ')}]`);
    } else {
      lines.push(`${key}: ${needsQuote(value) ? quote(value) : value}`);
    }
  }
  lines.push(FM_DELIMITER);
  return lines.join('\n');
}

/** 完整文档 = frontmatter + 正文（正文为空时省略尾部换行） */
export function parseDocument(text: string): { frontmatter: Frontmatter; body: string } {
  return parseFrontmatter(text);
}

export function serializeDocument(frontmatter: Frontmatter, body: string): string {
  const fm = serializeFrontmatter(frontmatter);
  if (!fm) return body;
  return body ? `${fm}\n${body}` : `${fm}\n`;
}
