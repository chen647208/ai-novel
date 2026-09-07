/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';

/**
 * 书籍库动作 hook：建/开/删/复制/重命名/导入导出，全部落 projectStore。
 * App.tsx 只解构使用，不再持有项目 CRUD 细节。
 */

import { useCallback } from 'react';
import { type Project } from '../../shared/types';
import { repository } from '../shared/services/repository';
import { dialogService } from '@/shared/services/dialogService';
import { i18n } from '../i18n';
import { useProjectStore } from './stores/projectStore';
import { composeAppState, seedPersistBaseline } from './stores/persistenceBridge';
import { hydrateStoresFromState } from './useAppBootstrap';
import { normalizeImportedState } from './initialState';

export interface BookActions {
  openBook: (bookId: string) => void;
  createBook: (title: string, description?: string, templateType?: 'blank' | 'duplicate' | 'example', sourceBookId?: string) => void;
  /** 先建后改：一键建空白书（默认名，不开模态），直接进工作区。 */
  createQuickBook: () => void;
  renameBook: (bookId: string, newTitle: string) => void;
  deleteBook: (bookId: string) => Promise<void>;
  duplicateBook: (bookId: string) => void;
  exportBook: (book: Project) => void;
  importBook: () => Promise<void>;
  /** 仅清空当前项目内容（活动书存在时）。 */
  clearCurrentProject: (afterReset: () => void) => Promise<void>;
  /** 删除当前项目并回到书籍库。 */
  deleteCurrentProject: (afterReset: () => void) => Promise<void>;
  /** 全量数据导入：规范化后灌入双 store 并重建差分基线。 */
  importAllData: () => Promise<void>;
}

const emptyBook = (title: string): Project => ({
  id: Date.now().toString(),
  title,
  inspiration: '',
  intro: '',
  characters: [],
  outline: '',
  chapters: [],
  virtualChapters: [],
  knowledge: [],
  lastModified: Date.now(),
});

export function useBookActions(enterWorkspace: () => void): BookActions {
  const openBook = useCallback((bookId: string) => {
    useProjectStore.getState().setActiveProject(bookId);
    enterWorkspace();
  }, [enterWorkspace]);

  const createBook = useCallback((title: string, _description?: string, templateType?: 'blank' | 'duplicate' | 'example', sourceBookId?: string) => {
    const newBook = emptyBook(title);
    if (templateType === 'duplicate' && sourceBookId) {
      const sourceBook = useProjectStore.getState().projects.find(p => p.id === sourceBookId);
      if (sourceBook) {
        newBook.inspiration = sourceBook.inspiration;
        newBook.intro = sourceBook.intro;
        newBook.characters = [...sourceBook.characters];
        newBook.outline = sourceBook.outline;
        newBook.chapters = [...sourceBook.chapters];
        newBook.virtualChapters = [...sourceBook.virtualChapters];
        newBook.knowledge = [...sourceBook.knowledge];
      }
    }
    useProjectStore.getState().upsertProject(newBook);
    enterWorkspace();
  }, [enterWorkspace]);

  const createQuickBook = useCallback(() => {
    const base = i18n.t('app:book.defaultTitle');
    const titles = new Set(useProjectStore.getState().projects.map((p) => p.title));
    let title = base;
    for (let n = 2; titles.has(title); n++) title = `${base} ${n}`;
    useProjectStore.getState().upsertProject(emptyBook(title));
    enterWorkspace();
  }, [enterWorkspace]);

  const renameBook = useCallback((bookId: string, newTitle: string) => {
    useProjectStore.getState().renameProject(bookId, newTitle);
  }, []);

  const deleteBook = useCallback(async (bookId: string) => {
    if (!(await dialogService.confirm({ message: i18n.t('app:book.deleteConfirm'), danger: true }))) return;
    const wasActive = useProjectStore.getState().activeProjectId === bookId;
    useProjectStore.getState().removeProject(bookId);
    if (wasActive && useProjectStore.getState().projects.length === 0) {
      // 删除后已无书籍：回到书籍库空态
      useProjectStore.getState().setActiveProject(null);
    }
  }, []);

  const duplicateBook = useCallback((bookId: string) => {
    const sourceBook = useProjectStore.getState().projects.find(p => p.id === bookId);
    if (!sourceBook) return;
    const newBook = emptyBook(i18n.t('app:book.duplicateTitle', { title: sourceBook.title }));
    newBook.inspiration = sourceBook.inspiration;
    newBook.intro = sourceBook.intro;
    newBook.characters = [...sourceBook.characters];
    newBook.outline = sourceBook.outline;
    newBook.chapters = [...sourceBook.chapters];
    newBook.virtualChapters = [...sourceBook.virtualChapters];
    newBook.knowledge = [...sourceBook.knowledge];
    useProjectStore.getState().upsertProject(newBook);
    enterWorkspace();
  }, [enterWorkspace]);

  const exportBook = useCallback((book: Project) => {
    repository.exportBook(book);
  }, []);

  const importBook = useCallback(async () => {
    try {
      const imported = await repository.importBook();
      const existing = useProjectStore.getState().projects.find(p => p.title === imported.title);
      if (existing) {
        const newTitle = await dialogService.prompt({
          title: i18n.t('app:book.renameImportTitle'),
          message: i18n.t('app:book.renameImportMessage', { title: imported.title }),
          defaultValue: i18n.t('app:book.importedTitle', { title: imported.title }),
        });
        if (newTitle === null) return;
        imported.title = newTitle;
      }
      useProjectStore.getState().upsertProject(imported);
      dialogService.alert(i18n.t('app:book.importSuccess', { title: imported.title }));
    } catch (error) {
      logger.error('Failed to import book:', error);
      if (error instanceof Error && error.message !== '未选择文件') {
        dialogService.alert(i18n.t('app:book.importFailed', { message: error.message }));
      }
    }
  }, []);

  const clearCurrentProject = useCallback(async (afterReset: () => void) => {
    const active = useProjectStore.getState().projects.find(
      p => p.id === useProjectStore.getState().activeProjectId,
    );
    if (!active) return;
    const ok = await dialogService.confirm({ message: i18n.t('app:book.clearConfirm', { title: active.title }), danger: true });
    if (!ok) return;
    useProjectStore.getState().updateActiveProject({
      inspiration: '', intro: '', characters: [], outline: '', chapters: [], virtualChapters: [], knowledge: [],
    });
    afterReset();
  }, []);

  const deleteCurrentProject = useCallback(async (afterReset: () => void) => {
    const { activeProjectId, projects } = useProjectStore.getState();
    const active = projects.find(p => p.id === activeProjectId);
    if (!active) return;
    const ok = await dialogService.confirm({
      title: i18n.t('app:book.deleteProjectTitle'),
      message: i18n.t('app:book.deleteProjectConfirm', { title: active.title }),
      danger: true,
    });
    if (!ok) return;
    useProjectStore.getState().removeProject(active.id);
    afterReset();
  }, []);

  const importAllData = useCallback(async () => {
    const imported = await repository.importAll();
    if (!imported) throw new Error('导入的数据为空');
    hydrateStoresFromState(normalizeImportedState(imported));
    seedPersistBaseline(composeAppState());
    dialogService.alert(i18n.t('app:importAll.success'));
  }, []);

  return { openBook, createBook, createQuickBook, renameBook, deleteBook, duplicateBook, exportBook, importBook, clearCurrentProject, deleteCurrentProject, importAllData };
}
