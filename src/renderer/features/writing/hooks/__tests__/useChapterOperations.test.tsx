// @vitest-environment jsdom
/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { act,renderHook } from '@testing-library/react';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import type { Project } from '../../../../../shared/types';
import { useChapterOperations } from '../useChapterOperations';

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn(async () => true) }));
vi.mock('@/shared/services/dialogService', () => ({
  dialogService: {
    confirm: confirmMock,
    alert: vi.fn(),
  },
}));

const t = ((key: string) => key) as unknown as Parameters<typeof useChapterOperations>[0]['t'];

function setup(project: Project, activeChapterId: string | null) {
  const projectRef = { current: project };
  const onUpdate = vi.fn();
  const setActiveChapterId = vi.fn();
  const editorRef = { current: null };
  const { result } = renderHook(() =>
    useChapterOperations({ projectRef, onUpdate, t, activeChapterId, setActiveChapterId, editorRef }),
  );
  return { result, onUpdate, setActiveChapterId, projectRef, editorRef };
}

describe('useChapterOperations', () => {
  beforeEach(() => {
    confirmMock.mockClear();
    confirmMock.mockResolvedValue(true);
  });

  it('新建章节：追加并切换过去', () => {
    const { result, onUpdate, setActiveChapterId } = setup({ chapters: [] } as unknown as Project, null);
    act(() => result.current.handleNewChapter());
    const chapters = onUpdate.mock.calls[0]?.[0]?.chapters as Array<{ id: string }>;
    expect(chapters).toHaveLength(1);
    expect(setActiveChapterId).toHaveBeenCalledWith(chapters[0]?.id);
  });

  it('删除当前章：移除并把活动章切到剩余首章', async () => {
    const project = {
      chapters: [
        { id: 'c1', title: 'A', order: 0, content: '', summary: '' },
        { id: 'c2', title: 'B', order: 1, content: '', summary: '' },
      ],
    } as unknown as Project;
    const { result, onUpdate, setActiveChapterId } = setup(project, 'c1');
    await act(async () => {
      await result.current.handleDeleteChapter('c1');
    });
    expect(onUpdate).toHaveBeenCalledWith({ chapters: [expect.objectContaining({ id: 'c2' })] });
    expect(setActiveChapterId).toHaveBeenCalledWith('c2');
  });
});
