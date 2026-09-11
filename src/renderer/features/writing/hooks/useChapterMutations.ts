/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 写作编辑器章节字段写回（从 WritingEditor 抽出）：正文/细纲/摘要/整章替换。
 */
import { type Chapter, type Project } from '../../../../shared/types';

interface UseChapterMutationsOptions {
  project: Project;
  activeChapterId: string | null;
  onUpdate: (updates: Partial<Project>) => void;
  setSaveDirty: (dirty: boolean) => void;
}

export function useChapterMutations({ project, activeChapterId, onUpdate, setSaveDirty }: UseChapterMutationsOptions) {
  // 用新的 chapter 对象（如删除快照后）替换 chapters 中同 ID 项
  const handleUpdateChapter = (updated: Chapter) => {
    onUpdate({ chapters: project.chapters.map((c) => (c.id === updated.id ? updated : c)) });
  };

  const updateChapterContent = (text: string) => {
    if (!activeChapterId) return;
    onUpdate({ chapters: project.chapters.map((c) => c.id === activeChapterId ? { ...c, content: text } : c) });
    setSaveDirty(true);
  };

  const updateChapterSummary = (summary: string) => {
    if (!activeChapterId) return;
    onUpdate({ chapters: project.chapters.map((c) => c.id === activeChapterId ? { ...c, summary } : c) });
  };

  const updateChapterContentSummary = (contentSummary: string) => {
    if (!activeChapterId) return;
    onUpdate({ chapters: project.chapters.map((c) => c.id === activeChapterId ? { ...c, contentSummary } : c) });
  };

  const updateActiveChapterTitle = (title: string) => {
    if (!activeChapterId) return;
    onUpdate({ chapters: project.chapters.map((c) => c.id === activeChapterId ? { ...c, title } : c) });
  };

  return { handleUpdateChapter, updateChapterContent, updateChapterSummary, updateChapterContentSummary, updateActiveChapterTitle };
}
