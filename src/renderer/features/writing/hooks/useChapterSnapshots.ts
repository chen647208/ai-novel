/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 手动编辑快照调度（从 WritingEditor 抽出）：定时捕获 + 切章补拍 + 手动快照。
 * 防误删/误覆盖；单轮最多一章、30s 扫描，避免高频写盘。
 */
import { useCallback, useEffect, useRef } from 'react';

import { appendSnapshot, createSnapshot, shouldAutoSnapshot } from '@/shared/services/chapterSnapshotService';

import type { Project } from '../../../../shared/types';

type SnapshotSource = 'auto' | 'manual' | 'before-clear';

interface UseChapterSnapshotsArgs {
  project: Project;
  activeChapterId: string | null;
  onUpdate: (updates: Partial<Project>) => void;
}

export function useChapterSnapshots({ project, activeChapterId, onUpdate }: UseChapterSnapshotsArgs): {
  handleManualSnapshot: () => void;
  snapshotChapterIfDue: (chapterId: string, source: SnapshotSource) => void;
} {
  const projectRef = useRef(project);
  projectRef.current = project;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const snapshotChapterIfDue = useCallback((chapterId: string, source: SnapshotSource): void => {
    const chapters = projectRef.current.chapters;
    const target = chapters.find((c) => c.id === chapterId);
    if (!target) return;
    if (source === 'auto' && !shouldAutoSnapshot(target)) return;
    if ((target.content ?? '').trim().length === 0) return;
    if (target.snapshots?.some((s) => s.content === target.content)) return; // 内容未变
    const updated = chapters.map((c) =>
      c.id === chapterId ? appendSnapshot(c, createSnapshot(c.content, source)) : c,
    );
    onUpdateRef.current({ chapters: updated });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const due = projectRef.current.chapters.find((c) => shouldAutoSnapshot(c));
      if (due) snapshotChapterIfDue(due.id, 'auto');
    }, 30_000);
    return () => clearInterval(timer);
  }, [snapshotChapterIfDue]);

  // 切换章节时为刚离开的章节补一次快照
  const prevChapterIdRef = useRef<string | null>(activeChapterId);
  useEffect(() => {
    const prev = prevChapterIdRef.current;
    if (prev && prev !== activeChapterId) {
      snapshotChapterIfDue(prev, 'auto');
    }
    prevChapterIdRef.current = activeChapterId;
  }, [activeChapterId, snapshotChapterIfDue]);

  const handleManualSnapshot = useCallback((): void => {
    if (activeChapterId) snapshotChapterIfDue(activeChapterId, 'manual');
  }, [activeChapterId, snapshotChapterIfDue]);

  return { handleManualSnapshot, snapshotChapterIfDue };
}
