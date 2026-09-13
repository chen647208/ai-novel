/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 作品与 Y.Doc 的映射：章节列表为 Y.Array，章节正文为 Y.XmlFragment。
 * 正文与 DSL 的互转由注入的编解码器完成（编辑器侧用 ProseMirror 编解码器）。
 */
import type { Chapter, Project } from '@shared/types';
import * as Y from 'yjs';

const CHAPTERS_KEY = 'chapters';

/** 正文编解码器：把 DSL 写进 Y.XmlFragment，或从 Y.XmlFragment 读出 DSL。 */
export interface ChapterContentCodec {
  /** 写入前片段已清空，实现只需追加内容。 */
  toFragment(dsl: string, fragment: Y.XmlFragment): void;
  toDsl(fragment: Y.XmlFragment): string;
}

export function createProjectDoc(project: Project, codec: ChapterContentCodec): Y.Doc {
  const doc = new Y.Doc();
  seedChapters(doc, project.chapters ?? [], codec);
  return doc;
}

function getChapters(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray<Y.Map<unknown>>(CHAPTERS_KEY);
}

function makeChapterMap(chapter: Chapter): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  map.set('id', chapter.id);
  map.set('title', chapter.title);
  map.set('summary', chapter.summary);
  map.set('order', chapter.order);
  map.set('status', chapter.status ?? 'draft');
  map.set('content', new Y.XmlFragment());
  return map;
}

function fillFragment(map: Y.Map<unknown>, content: string, codec: ChapterContentCodec): void {
  const fragment = map.get('content');
  if (fragment instanceof Y.XmlFragment) codec.toFragment(content, fragment);
}

function seedChapters(doc: Y.Doc, chapters: Chapter[], codec: ChapterContentCodec): void {
  doc.transact(() => {
    const array = getChapters(doc);
    array.delete(0, array.length);
    const maps = chapters.map((chapter) => makeChapterMap(chapter));
    array.push(maps);
    // 片段先并入文档，再写入内容，避免对未挂载的共享类型读写。
    chapters.forEach((chapter, index) => {
      const map = maps[index];
      if (map) fillFragment(map, chapter.content, codec);
    });
  }, 'seed');
}

function readStatus(value: unknown): NonNullable<Chapter['status']> {
  return value === 'writing' || value === 'done' || value === 'final' ? value : 'draft';
}

function toChapter(map: Y.Map<unknown>, codec: ChapterContentCodec): Chapter {
  const content = map.get('content');
  return {
    id: String(map.get('id') ?? ''),
    title: String(map.get('title') ?? ''),
    summary: String(map.get('summary') ?? ''),
    content: content instanceof Y.XmlFragment ? codec.toDsl(content) : '',
    order: Number(map.get('order') ?? 0),
    status: readStatus(map.get('status')),
  };
}

export function docToChapters(doc: Y.Doc, codec: ChapterContentCodec): Chapter[] {
  return getChapters(doc).toArray().map((map) => toChapter(map, codec));
}

export function docToProjectPatch(doc: Y.Doc, codec: ChapterContentCodec): Partial<Project> {
  return { chapters: docToChapters(doc, codec) };
}

/** 取某章节的正文片段（编辑器绑定与测试用）。 */
export function getChapterFragment(doc: Y.Doc, chapterId: string): Y.XmlFragment | undefined {
  const map = getChapters(doc).toArray().find((item) => item.get('id') === chapterId);
  const content = map?.get('content');
  return content instanceof Y.XmlFragment ? content : undefined;
}

/** 把本地作品的章节增删改同步进 Y.Doc；事务来源标记为 origin，便于区分远程更新。 */
export function applyProjectToDoc(doc: Y.Doc, project: Project, codec: ChapterContentCodec, origin: unknown = 'local-project'): void {
  const chapters = project.chapters ?? [];
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  doc.transact(() => {
    const array = getChapters(doc);
    for (let index = array.length - 1; index >= 0; index -= 1) {
      const map = array.get(index);
      if (!byId.has(String(map.get('id') ?? ''))) array.delete(index, 1);
    }
    const existing = new Map<string, Y.Map<unknown>>();
    array.forEach((map) => existing.set(String(map.get('id') ?? ''), map));
    for (const chapter of chapters) {
      const map = existing.get(chapter.id);
      if (!map) {
        const created = makeChapterMap(chapter);
        array.push([created]);
        fillFragment(created, chapter.content, codec);
        continue;
      }
      if (map.get('title') !== chapter.title) map.set('title', chapter.title);
      if (map.get('summary') !== chapter.summary) map.set('summary', chapter.summary);
      if (map.get('order') !== chapter.order) map.set('order', chapter.order);
      if (map.get('status') !== (chapter.status ?? 'draft')) map.set('status', chapter.status ?? 'draft');
      const fragment = map.get('content');
      if (fragment instanceof Y.XmlFragment && codec.toDsl(fragment) !== chapter.content) {
        fragment.delete(0, fragment.length);
        codec.toFragment(chapter.content, fragment);
      }
    }
  }, origin);
}
