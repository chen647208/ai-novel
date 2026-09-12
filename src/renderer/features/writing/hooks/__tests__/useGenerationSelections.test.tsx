/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

// @vitest-environment jsdom


import { act,renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Project } from '../../../../../shared/types';
import { useGenerationSelections } from '../useGenerationSelections';

function project(): Project {
  return {
    id: 'b1',
    title: 't',
    chapters: [],
    characters: [{ id: 'c1' }, { id: 'c2' }],
    knowledge: [
      { id: 'k1', category: 'writing' },
      { id: 'k2', category: 'world' },
    ],
  } as unknown as Project;
}

describe('useGenerationSelections', () => {
  it('toggle/全选/清空人物', () => {
    const { result } = renderHook(() => useGenerationSelections(project(), false));
    act(() => result.current.toggleCharacter('c1'));
    expect([...result.current.selectedCharacterIds]).toEqual(['c1']);
    act(() => result.current.toggleCharacter('c1'));
    expect(result.current.selectedCharacterIds.size).toBe(0);
    act(() => result.current.selectAllCharacters());
    expect([...result.current.selectedCharacterIds].sort()).toEqual(['c1', 'c2']);
    act(() => result.current.clearAllCharacters());
    expect(result.current.selectedCharacterIds.size).toBe(0);
  });

  it('全选知识只取 writing 分类', () => {
    const { result } = renderHook(() => useGenerationSelections(project(), false));
    act(() => result.current.selectAllKnowledge());
    expect([...result.current.selectedKnowledgeIds]).toEqual(['k1']);
  });

  it('打开生成弹窗时清空知识选择', () => {
    const { result, rerender } = renderHook(({ open }) => useGenerationSelections(project(), open), {
      initialProps: { open: false },
    });
    act(() => result.current.toggleKnowledge('k1'));
    expect(result.current.selectedKnowledgeIds.size).toBe(1);
    rerender({ open: true });
    expect(result.current.selectedKnowledgeIds.size).toBe(0);
  });
});
