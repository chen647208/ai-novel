/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 作品与 Y.Doc 的映射：章节列表为 Y.Array，章节正文为 Y.Text，其余字段为 Y.Map。 */
import type { Chapter, Project } from '@shared/types';
import * as Y from 'yjs';

const CHAPTERS_KEY = 'chapters';

export function createProjectDoc(project: Project): Y.Doc {
  const doc = new Y.Doc();
  seedChapters(doc, project.chapters ?? []);
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
  map.set('content', new Y.Text(chapter.content));
  map.set('order', chapter.order);
  map.set('status', chapter.status ?? 'draft');
  return map;
}

function seedChapters(doc: Y.Doc, chapters: Chapter[]): void {
  doc.transact(() => {
    const array = getChapters(doc);
    array.delete(0, array.length);
    array.push(chapters.map((chapter) => makeChapterMap(chapter)));
  }, 'seed');
}

function readStatus(value: unknown): NonNullable<Chapter['status']> {
  return value === 'writing' || value === 'done' || value === 'final' ? value : 'draft';
}

function toChapter(map: Y.Map<unknown>): Chapter {
  const content = map.get('content');
  return {
    id: String(map.get('id') ?? ''),
    title: String(map.get('title') ?? ''),
    summary: String(map.get('summary') ?? ''),
    content: content instanceof Y.Text ? content.toString() : '',
    order: Number(map.get('order') ?? 0),
    status: readStatus(map.get('status')),
  };
}

export function docToChapters(doc: Y.Doc): Chapter[] {
  return getChapters(doc).toArray().map((map) => toChapter(map));
}

export function docToProjectPatch(doc: Y.Doc): Partial<Project> {
  return { chapters: docToChapters(doc) };
}

/** 把本地作品的章节增删改同步进 Y.Doc；事务来源标记为 local-project，便于区分远程更新。 */
export function applyProjectToDoc(doc: Y.Doc, project: Project, origin: unknown = 'local-project'): void {
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
        array.push([makeChapterMap(chapter)]);
        continue;
      }
      if (map.get('title') !== chapter.title) map.set('title', chapter.title);
      if (map.get('summary') !== chapter.summary) map.set('summary', chapter.summary);
      if (map.get('order') !== chapter.order) map.set('order', chapter.order);
      if (map.get('status') !== (chapter.status ?? 'draft')) map.set('status', chapter.status ?? 'draft');
      const text = map.get('content');
      if (text instanceof Y.Text && text.toString() !== chapter.content) {
        text.delete(0, text.length);
        text.insert(0, chapter.content);
      }
    }
  }, origin);
}
