/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 剧本模型：Fountain 解析（fountain-js）与序列化，以及与章节的双向转换。 */
import type { Chapter } from '@shared/types';
import { Fountain } from 'fountain-js';

export type ScreenplayElementType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'section'
  | 'synopsis'
  | 'note'
  | 'centered';

export interface ScreenplayElement {
  type: ScreenplayElementType;
  text: string;
}

export interface ScreenplayDocument {
  title: string;
  elements: ScreenplayElement[];
}

const TOKEN_TYPES: Record<string, ScreenplayElementType> = {
  scene_heading: 'scene_heading',
  action: 'action',
  character: 'character',
  parenthetical: 'parenthetical',
  dialogue: 'dialogue',
  transition: 'transition',
  section: 'section',
  synopsis: 'synopsis',
  note: 'note',
  centered: 'centered',
};

const DIALOGUE_TYPES: ScreenplayElementType[] = ['character', 'parenthetical', 'dialogue'];

export function parseFountain(text: string): ScreenplayDocument {
  const script = new Fountain().parse(text, true);
  const elements: ScreenplayElement[] = [];
  let title = '';
  for (const token of script.tokens) {
    if (token.is_title) {
      if (token.type === 'title' && token.text) title = token.text;
      continue;
    }
    const type = TOKEN_TYPES[token.type];
    if (type && typeof token.text === 'string') elements.push({ type, text: token.text });
  }
  return { title, elements };
}

export function toFountain(doc: ScreenplayDocument): string {
  const lines: string[] = [];
  if (doc.title) lines.push(`Title: ${doc.title}`, '');
  let previous: ScreenplayElementType | null = null;
  for (const element of doc.elements) {
    const dialogueBlock = DIALOGUE_TYPES.includes(element.type) && previous !== null && DIALOGUE_TYPES.includes(previous);
    if (previous !== null && !dialogueBlock) lines.push('');
    switch (element.type) {
      case 'parenthetical':
        lines.push(`(${element.text})`);
        break;
      case 'section':
        lines.push(`# ${element.text}`);
        break;
      case 'synopsis':
        lines.push(`= ${element.text}`);
        break;
      case 'note':
        lines.push(`[[${element.text}]]`);
        break;
      case 'centered':
        lines.push(`> ${element.text} <`);
        break;
      default:
        lines.push(element.text);
    }
    previous = element.type;
  }
  return lines.join('\n');
}

function elementToLine(element: ScreenplayElement): string {
  switch (element.type) {
    case 'character':
      return `# @character: ${element.text}`;
    case 'parenthetical':
      return `（${element.text}）`;
    case 'transition':
      return `> ${element.text}`;
    default:
      return element.text;
  }
}

/** 每个场景标题开启一个新章节；对白块与动作块以空行分隔写入章节正文。 */
export function screenplayToChapters(doc: ScreenplayDocument, idFor: (index: number) => string): Chapter[] {
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;
  let block: string[] = [];
  let blockType: 'dialogue' | 'other' | null = null;
  const flush = () => {
    if (current && block.length > 0) {
      const text = block.join('\n');
      current.content = current.content ? `${current.content}\n\n${text}` : text;
    }
    block = [];
    blockType = null;
  };
  for (const element of doc.elements) {
    if (!current || element.type === 'scene_heading') {
      flush();
      current = {
        id: idFor(chapters.length),
        title: element.type === 'scene_heading' ? element.text : '',
        summary: '',
        content: '',
        order: chapters.length,
        status: 'draft',
      };
      chapters.push(current);
      if (element.type === 'scene_heading') continue;
    }
    const type = DIALOGUE_TYPES.includes(element.type) ? 'dialogue' : 'other';
    if (block.length > 0 && type !== blockType) flush();
    blockType = type;
    block.push(elementToLine(element));
  }
  flush();
  return chapters;
}

export function chaptersToFountain(chapters: Chapter[], title = ''): string {
  const elements: ScreenplayElement[] = [];
  for (const chapter of chapters) {
    elements.push({ type: 'scene_heading', text: chapter.title });
    for (const rawBlock of chapter.content.split(/\n{2,}/)) {
      const lines = rawBlock.split('\n').map((line) => line.trim()).filter(Boolean);
      const first = lines[0];
      if (!first) continue;
      if (first.startsWith('# @character:')) {
        elements.push({ type: 'character', text: first.slice('# @character:'.length).trim() });
        for (const line of lines.slice(1)) {
          if (line.startsWith('（') && line.endsWith('）')) elements.push({ type: 'parenthetical', text: line.slice(1, -1) });
          else elements.push({ type: 'dialogue', text: line });
        }
      } else if (first.startsWith('（') && first.endsWith('）')) {
        elements.push({ type: 'parenthetical', text: first.slice(1, -1) });
      } else if (first.startsWith('> ')) {
        elements.push({ type: 'transition', text: first.slice(2) });
      } else {
        for (const line of lines) elements.push({ type: 'action', text: line });
      }
    }
  }
  return toFountain({ title, elements });
}
