/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 生成弹窗的三组选择状态（知识/人物/前情），从 WritingEditor 抽出。
 * 纯选择状态，不触章节数据；打开弹窗时清空知识选择。
 */
import { useCallback, useEffect, useState } from 'react';

import type { Chapter, Project } from '../../../../shared/types';
import { getPreviousChapterSummaryIds, toggleSetValue } from '../utils';

export interface GenerationSelections {
  selectedKnowledgeIds: Set<string>;
  selectedCharacterIds: Set<string>;
  selectedChapterSummaryIds: Set<string>;
  toggleKnowledge: (id: string) => void;
  selectAllKnowledge: () => void;
  clearAllKnowledge: () => void;
  toggleCharacter: (id: string) => void;
  selectAllCharacters: () => void;
  clearAllCharacters: () => void;
  toggleChapterSummary: (id: string) => void;
  selectAllChapterSummaries: (currentChapter: Chapter | null | undefined) => void;
  clearAllChapterSummaries: () => void;
}

export function useGenerationSelections(project: Project, genModalOpen: boolean): GenerationSelections {
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<Set<string>>(new Set());
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [selectedChapterSummaryIds, setSelectedChapterSummaryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (genModalOpen) setSelectedKnowledgeIds(new Set());
  }, [genModalOpen]);

  const toggleKnowledge = useCallback((id: string) => setSelectedKnowledgeIds((prev) => toggleSetValue(prev, id)), []);
  const selectAllKnowledge = useCallback(() => {
    const allIds = (project.knowledge || []).filter((k) => k.category === 'writing').map((k) => k.id);
    setSelectedKnowledgeIds(new Set(allIds));
  }, [project.knowledge]);
  const clearAllKnowledge = useCallback(() => setSelectedKnowledgeIds(new Set()), []);

  const toggleCharacter = useCallback((id: string) => setSelectedCharacterIds((prev) => toggleSetValue(prev, id)), []);
  const selectAllCharacters = useCallback(() => {
    setSelectedCharacterIds(new Set(project.characters.map((c) => c.id)));
  }, [project.characters]);
  const clearAllCharacters = useCallback(() => setSelectedCharacterIds(new Set()), []);

  const toggleChapterSummary = useCallback(
    (id: string) => setSelectedChapterSummaryIds((prev) => toggleSetValue(prev, id)),
    [],
  );
  const selectAllChapterSummaries = useCallback(
    (currentChapter: Chapter | null | undefined) => {
      setSelectedChapterSummaryIds(getPreviousChapterSummaryIds(project.chapters, currentChapter));
    },
    [project.chapters],
  );
  const clearAllChapterSummaries = useCallback(() => setSelectedChapterSummaryIds(new Set()), []);

  return {
    selectedKnowledgeIds,
    selectedCharacterIds,
    selectedChapterSummaryIds,
    toggleKnowledge,
    selectAllKnowledge,
    clearAllKnowledge,
    toggleCharacter,
    selectAllCharacters,
    clearAllCharacters,
    toggleChapterSummary,
    selectAllChapterSummaries,
    clearAllChapterSummaries,
  };
}
