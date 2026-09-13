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

import { applyProjectToDoc, type ChapterContentCodec,createProjectDoc, docToChapters } from '../projectDoc';

/** 测试用编解码器：正文以单个 XmlText 存放，避免依赖编辑器 schema。 */
const codec: ChapterContentCodec = {
  toFragment: (dsl, fragment) => {
    if (dsl) fragment.insert(0, [new Y.XmlText(dsl)]);
  },
  toDsl: (fragment) => fragment.toArray().map((node) => (node instanceof Y.XmlText ? node.toString() : '')).join(''),
};

function makeProject(): Project {
  return {
    id: 'p1',
    title: '协作测试',
    inspiration: '',
    intro: '',
    outline: '',
    virtualChapters: [],
    knowledge: [],
    characters: [],
    lastModified: 0,
    chapters: [
      { id: 'c1', title: '第一章', summary: '摘要一', content: '正文一', order: 0, status: 'writing' },
      { id: 'c2', title: '第二章', summary: '', content: '正文二', order: 1 },
    ],
  };
}

describe('projectDoc', () => {
  it('作品与 Y.Doc 往返一致', () => {
    const chapters = docToChapters(createProjectDoc(makeProject(), codec), codec);
    expect(chapters.map((chapter) => chapter.id)).toEqual(['c1', 'c2']);
    expect(chapters[0]?.content).toBe('正文一');
    expect(chapters[0]?.status).toBe('writing');
    expect(chapters[1]?.status).toBe('draft');
  });

  it('两个副本交换增量后收敛', () => {
    const project = makeProject();
    const a = createProjectDoc(project, codec);
    const b = new Y.Doc();
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    applyProjectToDoc(a, { ...project, chapters: [
      { id: 'c1', title: '第一章', summary: '摘要一', content: '正文一（甲）', order: 0, status: 'writing' },
      { id: 'c2', title: '第二章', summary: '', content: '正文二', order: 1 },
    ] }, codec);
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a), 'remote');

    applyProjectToDoc(b, { ...project, chapters: [
      { id: 'c1', title: '第一章', summary: '摘要一', content: '正文一（甲）', order: 0, status: 'writing' },
      { id: 'c2', title: '第二章', summary: '', content: '正文二（乙）', order: 1 },
    ] }, codec);
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b), 'remote');

    const chaptersA = docToChapters(a, codec);
    const chaptersB = docToChapters(b, codec);
    expect(chaptersA.find((chapter) => chapter.id === 'c1')?.content).toBe('正文一（甲）');
    expect(chaptersB.find((chapter) => chapter.id === 'c2')?.content).toBe('正文二（乙）');
    expect(chaptersA).toEqual(chaptersB);
  });

  it('本地增删改同步进 Y.Doc', () => {
    const doc = createProjectDoc(makeProject(), codec);
    const project = makeProject();
    project.chapters = [
      { id: 'c1', title: '第一章（改）', summary: '摘要一', content: '正文一', order: 0, status: 'writing' },
      { id: 'c3', title: '第三章', summary: '', content: '正文三', order: 2 },
    ];
    applyProjectToDoc(doc, project, codec);
    const chapters = docToChapters(doc, codec);
    expect(chapters.map((chapter) => chapter.id)).toEqual(['c1', 'c3']);
    expect(chapters[0]?.title).toBe('第一章（改）');
  });
});
