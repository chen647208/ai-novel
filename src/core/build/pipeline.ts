/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 构建管线（docs/design/07 §3）：select → transform → render。
 * 两个注册表都是插件贡献点（04 篇贡献点 #3）。
 * 纯函数、无 IO：渲染端/测试环境共用；字数统计（写作统计）与导出
 * 共用同一段文本来源，保证「成稿字数」单一口径（验收 4）。
 */
import type { NodeEntity, AttributeEntity, EdgeEntity } from '../entities';
import type { BuildProfile } from './profile.js';
import { typeMatches } from './profile.js';

// ── select ───────────────────────────────────────────────────────────

export interface SelectedNode {
  id: string;
  type: string;
  title: string;
  body: string;
  /** 构建序（order 属性优先，退化为 title 排序键） */
  order: number;
  status?: string;
}

function orderOf(node: NodeEntity, attrByNode: Map<string, AttributeEntity[]>): number {
  const order = attrByNode.get(node.id)?.find((a) => a.name === 'order' && !a.erased);
  const n = order ? Number(order.value) : NaN;
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function statusOf(node: NodeEntity, attrByNode: Map<string, AttributeEntity[]>): string | undefined {
  return attrByNode.get(node.id)?.find((a) => a.name === 'status' && !a.erased)?.value;
}

/** 选择：includeTypes + 单点排除 + 整类开关 + 状态过滤，输出按序节点。 */
export function select(profile: BuildProfile, entities: { nodes: NodeEntity[]; attrs: AttributeEntity[]; edges: EdgeEntity[] }): SelectedNode[] {
  const { selection } = profile;
  const attrByNode = new Map<string, AttributeEntity[]>();
  for (const attr of entities.attrs) {
    if (attr.erased) continue;
    const list = attrByNode.get(attr.nodeId) ?? [];
    list.push(attr);
    attrByNode.set(attr.nodeId, list);
  }

  const excluded = new Set(selection.exclude.filter((e) => e.startsWith('node:')).map((e) => e.slice(5)));

  const selected = entities.nodes
    .filter((n) => !n.erased && !excluded.has(n.id))
    .filter((n) => selection.includeTypes.some((p) => typeMatches(n.type, p)))
    .filter((n) => {
      if (selection.rootSwitches.cards === false && n.type.startsWith('card.')) return false;
      if (selection.rootSwitches.meta === false && n.type.startsWith('meta.')) return false;
      return true;
    })
    .filter((n) => selection.includeInactive || !['inactive', 'archived'].includes(statusOf(n, attrByNode) ?? ''))
    .map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, order: orderOf(n, attrByNode), status: statusOf(n, attrByNode) }));

  return selected.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh'));
}

// ── transform ────────────────────────────────────────────────────────

export type DocBlock =
  | { kind: 'chapter'; number?: number; text: string }
  | { kind: 'separator'; text: string }
  | { kind: 'paragraph'; text: string };

/** 变换器贡献点：插件可在渲染前插入结构改写（如 reverse-order）。 */
export interface Transformer {
  id: string;
  description: string;
  apply(nodes: SelectedNode[]): SelectedNode[];
}

const transformers = new Map<string, Transformer>();

export function registerTransformer(t: Transformer): void {
  transformers.set(t.id, t);
}

export function listTransformers(): Transformer[] {
  return [...transformers.values()];
}

/** 引用替换：[[id|别名]] / [[别名]] / @别名 → 显示名。 */
function resolveRefs(body: string, titleById: Map<string, string>): string {
  return body
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_m, _id, alias) => String(alias))
    .replace(/\[\[([^\]]+)\]\]/g, (_m, ref) => titleById.get(String(ref)) ?? String(ref))
    .replace(/@([\w\u4e00-\u9fff-]+)/g, (_m, name) => titleById.get(String(name)) ?? `@${String(name)}`);
}

/** 变换：标题模板 + 重编号 + 隐藏层级 + 引用替换。 */
export function transform(profile: BuildProfile, nodes: SelectedNode[]): DocBlock[] {
  const { headings, content } = profile.transform;
  const titleById = new Map(nodes.map((n) => [n.id, n.title]));

  let chapterNo = 0;
  const blocks: DocBlock[] = [];

  for (const node of nodes) {
    if (headings.hide.includes(node.type)) continue;

    const isChapter = node.type.startsWith('novel.chapter') || node.type.startsWith('meta.');
    const isScene = node.type.startsWith('novel.scene');
    if (isChapter) {
      if (headings.renumber) chapterNo += 1;
      const no = headings.renumber ? chapterNo : undefined;
      const title = headings.chapter
        .replace('%N', no !== undefined ? String(no) : '')
        .replace('%T', node.title)
        .trim();
      blocks.push({ kind: 'chapter', number: no, text: title });
    } else if (!isScene) {
      blocks.push({ kind: 'chapter', text: `【${node.title}】` });
    }

    const body = content.resolveRefs === 'displayName' ? resolveRefs(node.body, titleById) : node.body;
    const paragraphs = body
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .filter((p) => !content.stripTags.some((tag) => p.includes(`[${tag}]`)))
      .map((p) => p.replace(/\[\/?[a-z-]+\]/gi, ''));

    blocks.push({ kind: 'paragraph', text: paragraphs.join('\n\n') });
    if (headings.scene) blocks.push({ kind: 'separator', text: headings.scene });
  }

  // 尾部分隔符去掉
  for (let last = blocks.at(-1); last && last.kind === 'separator'; last = blocks.at(-1)) {
    blocks.pop();
  }
  return blocks;
}

// ── render ───────────────────────────────────────────────────────────

export interface Renderer {
  id: string;
  description: string;
  render(blocks: DocBlock[], profile: BuildProfile): string;
}

const renderers = new Map<string, Renderer>();

export function registerRenderer(r: Renderer): void {
  renderers.set(r.id, r);
}

export function listRenderers(): Renderer[] {
  return [...renderers.values()];
}

function renderTxt(blocks: DocBlock[]): string {
  return blocks
    .map((b) => (b.kind === 'chapter' ? b.text : b.kind === 'separator' ? b.text : b.text))
    .join('\n\n');
}

function renderMd(blocks: DocBlock[], profile: BuildProfile): string {
  return blocks
    .map((b) => {
      if (b.kind === 'chapter') {
        return profile.render.chapterPageBreak ? `${b.text}\n\n---` : `## ${b.text}`;
      }
      return b.text;
    })
    .join('\n\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderHtml(blocks: DocBlock[], profile: BuildProfile): string {
  const body = blocks
    .map((b) => {
      if (b.kind === 'chapter') {
        const pageBreak = profile.render.chapterPageBreak ? ' style="page-break-before: always"' : '';
        return `<h2${pageBreak}>${escapeHtml(b.text)}</h2>`;
      }
      if (b.kind === 'separator') return `<p class="scene">${escapeHtml(b.text)}</p>`;
      return b.text
        .split('\n\n')
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('\n');
    })
    .join('\n');
  const font = profile.render.font ?? 'Noto Serif SC';
  const line = profile.render.lineHeight ?? 1.15;
  return `<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8"><style>body{font-family:'${font}',serif;line-height:${line};}</style></head><body>\n${body}\n</body></html>`;
}

function escapeRtf(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === '\\') out += '\\\\';
    else if (ch === '{') out += '\\{';
    else if (ch === '}') out += '\\}';
    else if (ch === '\n') out += ' ';
    else if (code > 127) out += `\\u${code > 0x7fff ? code - 0x10000 : code}?`;
    else out += ch;
  }
  return out;
}

/**
 * RTF 渲染（Word/WPS 可直接打开）：首行为文档头（fonttbl+默认样式），
 * 尾行是闭合括号；章节标题加粗放大，分页符跟随 profile.render.chapterPageBreak。
 * 导出侧在首行后插入书名块（见 writing/utils.buildExportContent），故首行须保持单行。
 */
function renderRtf(blocks: DocBlock[], profile: BuildProfile): string {
  const font = profile.render.font ?? 'SimSun';
  const lines = [
    `{\\rtf1\\ansi\\ansicpg936\\deff0{\\fonttbl{\\f0 ${font};}}\\viewkind4\\uc1\\pard\\lang2052\\f0\\fs24`,
  ];
  for (const b of blocks) {
    if (b.kind === 'chapter') {
      const page = profile.render.chapterPageBreak ? '\\page ' : '';
      lines.push(`${page}{\\b\\fs32 ${escapeRtf(b.text)}}\\par`);
    } else if (b.kind === 'separator') {
      lines.push(`${escapeRtf(b.text)}\\par`);
    } else {
      for (const p of b.text.split('\n\n')) {
        lines.push(`${escapeRtf(p)}\\par`);
      }
    }
  }
  lines.push('}');
  return lines.join('\n');
}

// 内置渲染器（md/txt/html/rtf）
registerRenderer({ id: 'txt', description: '纯文本', render: (b) => renderTxt(b) });
registerRenderer({ id: 'md', description: 'Markdown', render: (b, p) => renderMd(b, p) });
registerRenderer({ id: 'html', description: 'HTML（内联样式，可直接打印）', render: (b, p) => renderHtml(b, p) });
registerRenderer({ id: 'rtf', description: 'RTF（Word/WPS 可直接打开）', render: (b, p) => renderRtf(b, p) });

/** 渲染入口：按 profile.format 找渲染器，未注册则报错。 */
export function renderDoc(blocks: DocBlock[], profile: BuildProfile): string {
  const renderer = renderers.get(profile.format);
  if (!renderer) {
    throw new Error(`未注册的渲染器: ${profile.format}（可用: ${listRenderers().map((r) => r.id).join(', ')}）`);
  }
  return renderer.render(blocks, profile);
}

/** 完整管线一步调用；同时返回成稿文本供字数统计共用（单一口径）。 */
export function runBuild(profile: BuildProfile, entities: { nodes: NodeEntity[]; attrs: AttributeEntity[]; edges: EdgeEntity[] }): { text: string; blocks: DocBlock[]; nodes: SelectedNode[] } {
  const nodes = select(profile, entities);
  const blocks = transform(profile, nodes);
  const text = renderDoc(blocks, profile);
  return { text, blocks, nodes };
}
