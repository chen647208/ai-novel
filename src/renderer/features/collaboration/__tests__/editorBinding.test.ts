/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { Project } from '@shared/types';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import { editorContentCodec } from '../editorBinding';
import { createProjectDoc, docToChapters, getChapterFragment } from '../projectDoc';

function makeProject(content = '你好世界'): Project {
  return {
    id: 'p1',
    title: 'T',
    inspiration: '',
    intro: '',
    outline: '',
    virtualChapters: [],
    knowledge: [],
    characters: [],
    lastModified: 0,
    chapters: [{ id: 'c1', title: '第一章', summary: '', content, order: 0 }],
  };
}

function firstText(fragment: Y.XmlFragment): Y.XmlText | undefined {
  const node = fragment.get(0);
  if (node instanceof Y.XmlElement) {
    const inner = node.get(0);
    return inner instanceof Y.XmlText ? inner : undefined;
  }
  return undefined;
}

function contentOf(doc: Y.Doc): string {
  return docToChapters(doc, editorContentCodec).find((chapter) => chapter.id === 'c1')?.content ?? '';
}

describe('editorBinding', () => {
  it('DSL 经 ProseMirror 与 Y.XmlFragment 往返一致', () => {
    const doc = createProjectDoc(makeProject('第一段\n\n第二段'), editorContentCodec);
    expect(getChapterFragment(doc, 'c1')).toBeDefined();
    expect(contentOf(doc)).toContain('第一段');
    expect(contentOf(doc)).toContain('第二段');
  });

  it('不同位置的并发插入都保留（节点级合并）', () => {
    const project = makeProject('你好世界');
    const a = createProjectDoc(project, editorContentCodec);
    const b = new Y.Doc();
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    const fragmentA = getChapterFragment(a, 'c1');
    const fragmentB = getChapterFragment(b, 'c1');
    firstText(fragmentA as Y.XmlFragment)?.insert(1, 'X');
    firstText(fragmentB as Y.XmlFragment)?.insert(3, 'Y');

    Y.applyUpdate(b, Y.encodeStateAsUpdate(a), 'remote');
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b), 'remote');

    const merged = contentOf(a);
    expect(merged).toBe(contentOf(b));
    expect(merged).toContain('X');
    expect(merged).toContain('Y');
  });
});
