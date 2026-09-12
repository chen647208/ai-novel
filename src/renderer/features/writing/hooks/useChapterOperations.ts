/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 章节增删改操作（从 WritingEditor 抽出）：新建/拆分/合并/删除/清空正文/清历史。
 * 只操作 chapters 数组，经 onUpdate 落库。
 */
import { uuidv7 } from '@core/entities';
import type { TFunction } from 'i18next';
import type React from 'react';
import { useCallback } from 'react';

import { dialogService } from '@/shared/services/dialogService';

import { isVirtualChapter } from '../../../../shared/constants/chapters';
import type { Chapter, Project } from '../../../../shared/types';
import { appendSnapshot, createSnapshot } from '../services/chapterSnapshotService';
import type { NovelEditorHandle } from '../types';

export interface ChapterOperationsOptions {
  projectRef: React.RefObject<Project>;
  onUpdate: (update: Partial<Project>) => void;
  t: TFunction<readonly ['writing', 'steps'], undefined>;
  activeChapterId: string | null;
  setActiveChapterId: (id: string | null) => void;
  editorRef: React.RefObject<NovelEditorHandle | null>;
  /** 清空章节历史后关闭历史查看器。 */
  onHistoryCleared?: () => void;
}

export interface ChapterOperations {
  handleNewChapter: () => void;
  handleClearContent: () => Promise<void>;
  handleSplitChapter: () => void;
  handleMergeNextChapter: () => Promise<void>;
  handleDeleteChapter: (chapterId: string) => Promise<void>;
  handleChaptersChange: (chapters: Chapter[]) => void;
  handleBatchDeleteChapter: (chapterIds: string[]) => Promise<void>;
  handleClearChapterHistory: () => Promise<void>;
}

export function useChapterOperations(options: ChapterOperationsOptions): ChapterOperations {
  const { projectRef, onUpdate, t, activeChapterId, setActiveChapterId, editorRef, onHistoryCleared } = options;

  // Enter×3 连按：在当前章之后插入新章并切换过去（默认名「第N章」，不阻塞继续输入）。
  const handleNewChapter = useCallback(() => {
    const chapters = projectRef.current.chapters;
    const nextOrder = chapters.reduce((m, c) => Math.max(m, c.order), -1) + 1;
    const num = chapters.filter((c) => !isVirtualChapter(c)).length + 1;
    const newChapter: Chapter = {
      id: `${Date.now()}-${uuidv7()}`,
      title: t('canvas.newChapterTitle', { num }),
      summary: '',
      content: '',
      order: nextOrder,
    };
    onUpdate({ chapters: [...chapters, newChapter] });
    setActiveChapterId(newChapter.id);
  }, [onUpdate, projectRef, setActiveChapterId, t]);

  const handleClearContent = useCallback(async () => {
    if (await dialogService.confirm({ message: t('editor.clearContentConfirm'), danger: true })) {
      if (!activeChapterId) return;
      // 快照与清空必须在同一次 chapters 更新中完成，否则后者会用旧数组覆盖掉快照
      const chapters = projectRef.current.chapters;
      const target = chapters.find((c) => c.id === activeChapterId);
      let updated = chapters;
      if (target && (target.content ?? '').trim().length > 0 && !target.snapshots?.some((s) => s.content === target.content)) {
        updated = updated.map((c) => (c.id === activeChapterId ? appendSnapshot(c, createSnapshot(c.content, 'before-clear')) : c));
      }
      updated = updated.map((c) => (c.id === activeChapterId ? { ...c, content: '' } : c));
      onUpdate({ chapters: updated });
    }
  }, [activeChapterId, onUpdate, projectRef, t]);

  // 章节拆分：按光标把本章正文切成两段，后段成为紧随其后的新章
  const handleSplitChapter = useCallback(() => {
    const parts = editorRef.current?.splitAtCursor();
    if (!parts) {
      dialogService.alert(t('editor.splitNeedCursor'));
      return;
    }
    const chapters = projectRef.current.chapters;
    const idx = chapters.findIndex((c) => c.id === activeChapterId);
    if (idx < 0) return;
    const current = chapters[idx];
    if (!current) return;
    const nextOrder = chapters.reduce((m, c) => Math.max(m, c.order), -1) + 1;
    const newChapter: Chapter = {
      id: `${Date.now()}-${uuidv7()}`,
      title: t('editor.splitNewTitle', { title: current.title }),
      summary: '',
      content: parts.after,
      order: nextOrder,
    };
    const updated = [...chapters];
    updated[idx] = { ...current, content: parts.before };
    updated.splice(idx + 1, 0, newChapter);
    onUpdate({ chapters: updated });
    setActiveChapterId(newChapter.id);
  }, [activeChapterId, editorRef, onUpdate, projectRef, setActiveChapterId, t]);

  // 章节合并：把下一章正文并入本章，删除下一章（正文全程保留，不漏字）
  const handleMergeNextChapter = useCallback(async () => {
    const chapters = projectRef.current.chapters;
    const idx = chapters.findIndex((c) => c.id === activeChapterId);
    if (idx < 0 || idx >= chapters.length - 1) return;
    const current = chapters[idx];
    const next = chapters[idx + 1];
    if (!current || !next) return;
    if (!(await dialogService.confirm({ message: t('editor.mergeConfirm', { title: next.title }) }))) return;
    const merged = [current.content, next.content].filter((s) => s && s.trim().length > 0).join('\n\n');
    const updated = [...chapters];
    updated[idx] = { ...current, content: merged };
    updated.splice(idx + 1, 1);
    onUpdate({ chapters: updated });
  }, [activeChapterId, onUpdate, projectRef, t]);

  const handleDeleteChapter = useCallback(
    async (chapterId: string) => {
      const chapters = projectRef.current.chapters;
      const target = chapters.find((c) => c.id === chapterId);
      if (!target) return;
      const ok = await dialogService.confirm({
        message: t('canvas.deleteChapterConfirm', { title: target.title }),
        danger: true,
      });
      if (!ok) return;
      const remaining = chapters.filter((c) => c.id !== chapterId);
      onUpdate({ chapters: remaining });
      if (activeChapterId === chapterId) {
        setActiveChapterId(remaining[0]?.id ?? null);
      }
    },
    [activeChapterId, onUpdate, projectRef, setActiveChapterId, t],
  );

  const handleChaptersChange = useCallback(
    (chapters: Chapter[]) => {
      onUpdate({ chapters });
    },
    [onUpdate],
  );

  const handleBatchDeleteChapter = useCallback(
    async (chapterIds: string[]) => {
      const ids = new Set(chapterIds);
      const chapters = projectRef.current.chapters;
      const remaining = chapters.filter((c) => !ids.has(c.id));
      onUpdate({ chapters: remaining });
      if (activeChapterId && ids.has(activeChapterId)) {
        setActiveChapterId(remaining[0]?.id ?? null);
      }
    },
    [activeChapterId, onUpdate, projectRef, setActiveChapterId],
  );

  const handleClearChapterHistory = useCallback(async () => {
    if (!activeChapterId) return;
    if (await dialogService.confirm({ message: t('editor.clearHistoryConfirm'), danger: true })) {
      const newChapters = projectRef.current.chapters.map((c) => (c.id === activeChapterId ? { ...c, history: [] } : c));
      onUpdate({ chapters: newChapters });
      onHistoryCleared?.();
    }
  }, [activeChapterId, onHistoryCleared, onUpdate, projectRef, t]);

  return {
    handleNewChapter,
    handleClearContent,
    handleSplitChapter,
    handleMergeNextChapter,
    handleDeleteChapter,
    handleChaptersChange,
    handleBatchDeleteChapter,
    handleClearChapterHistory,
  };
}
