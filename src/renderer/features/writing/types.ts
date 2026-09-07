/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type React from 'react';
import type { AIHistoryRecord, Chapter, ModelConfig, OutputMode, Project, PromptTemplate } from '../../../shared/types';
import type { ChapterStats, BookStats } from './services/writingStatsService';
import type { ExportFormat } from './utils';

export interface WritingEditorProps {
  project: Project;
  initialChapterId?: string | null;
  onBack: () => void;
}

export type BatchMode = 'single' | 'batch5' | 'batch10';

export interface BatchProgress {
  current: number;
  total: number;
  currentChapterTitle: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface MenuPosition {
  x: number;
  y: number;
}

export interface TextSelectionRange {
  start: number;
  end: number;
}

/**
 * TipTap 富文本画布对外暴露的命令式句柄。
 * 编排层（WritingEditor）通过它读取选区并定位菜单，
 * 不再依赖原生 textarea 的 selectionStart/End。
 */
export interface NovelEditorHandle {
  /**
   * 当前非空选区。range.start/end 为 ProseMirror 文档位置，
   * 与 applySelectionReplacement 的 from/to 语义一致（同一份 DSL 解析出的 doc）。
   * 无选区或仅空白时返回 null。
   */
  getSelection(): { text: string; range: TextSelectionRange } | null;
  /** 键盘选区时弹出菜单的视口坐标（已 clamp），无选区返回 null。 */
  getKeyboardSelectionMenuPosition(): { x: number; y: number } | null;
  /** 聚焦编辑器。 */
  focus(): void;
  /** 撤销/重做（StarterKit History，快照是另一条时间线，见 chapterSnapshotService）。 */
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  /** 写作原语：把当前选区收割为 darlingSlot 锚点，返回是否成功。 */
  harvestDarling(): boolean;
  /** 写作原语：在当前选区插入灰色 ghostNote 场景概要。 */
  insertGhostOutline(synopsis: string): boolean;
  /** 写作原语：主动开关拼写检查（默认关闭，无红波浪线常驻）。 */
  setSpellcheck(enabled: boolean): void;
}

export interface GenerationModalState {
  isOpen: boolean;
  chapter: Chapter | null;
}

export type WritingOutputMode = OutputMode;
export interface ChapterContextInfo {
  prevChapter: Chapter | null;
  prevContextText: string;
  nextChapter: Chapter | null;
  nextSummary: string;
}

export interface ChapterGenerationModalProps {
  genModal: GenerationModalState;
  setGenModal: (state: GenerationModalState) => void;
  modalContextInfo: ChapterContextInfo;
  useOutline: boolean;
  setUseOutline: (value: boolean) => void;
  project: Project;
  selectedCharacterIds: Set<string>;
  toggleCharacter: (id: string) => void;
  selectAllCharacters: () => void;
  clearAllCharacters: () => void;
  selectedChapterSummaryIds: Set<string>;
  toggleChapterSummary: (id: string) => void;
  selectAllChapterSummaries: () => void;
  clearAllChapterSummaries: () => void;
  editableSummary: string;
  setEditableSummary: (summary: string) => void;
  selectedKnowledgeIds: Set<string>;
  toggleKnowledge: (id: string) => void;
  selectAllKnowledge: () => void;
  clearAllKnowledge: () => void;
  writingPrompts: PromptTemplate[];
  selectedGenPromptId: string;
  setSelectedGenPromptId: (id: string) => void;
  targetWordCount: number;
  setTargetWordCount: (count: number) => void;
  batchMode: BatchMode;
  setBatchMode: (mode: BatchMode) => void;
  isBatchGenerating: boolean;
  batchProgress: BatchProgress;
  activeModel: ModelConfig | undefined;
  outputMode: OutputMode;
  setOutputMode: (mode: OutputMode) => void;
  isStreaming: boolean;
  streamingTokens: TokenUsage;
  traditionalTokens: TokenUsage;
  isGenerating: boolean;
  handleEnterEditor: () => void;
  handleModalGenerate: () => void;
  stopBatchGeneration: () => void;
}

export interface WritingEditorToolbarProps {
  activeChapterId: string | null;
  activeChapterTitle: string;
  hasProjectChapters: boolean;
  hasActiveChapterHistory: boolean;
  isSidebarOpen: boolean;
  isGlobalHistorySidebarOpen: boolean;
  chapterStats: ChapterStats;
  bookStats: BookStats;
  snapshotCount: number;
  openForeshadowCount: number;
  overdueForeshadowCount: number;
  isFocusMode: boolean;
  lastSaved: number;
  targetWordCount: number;
  typewriter: boolean;
  saveDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onBack: () => void;
  onTitleChange: (title: string) => void;
  onOpenExport: () => void;
  onOpenForeshadow: () => void;
  onClearContent: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleGlobalHistory: () => void;
  onOpenChapterHistory: () => void;
  onOpenSidebar: () => void;
  onToggleFocusMode: () => void;
  onToggleTypewriter: () => void;
  onManualSnapshot: () => void;
}

export interface WritingSelectionMenuProps {
  menuPos: MenuPosition | null;
  isEditModalOpen: boolean;
  hasModel: boolean;
  onOpenEditModal: () => void;
  onClearSelection: () => void;
}

export interface WritingEditorStatusOverlayProps {
  isGenerating: boolean;
  isStreaming: boolean;
  isBatchGenerating: boolean;
  targetWordCount: number;
  selectedKnowledgeCount: number;
  streamingContentLength: number;
  batchProgress: BatchProgress;
  onStopStreaming: () => void;
  onStopBatchGeneration: () => void;
}

export interface ChapterSummarySectionProps {
  activeChapter: Chapter | undefined;
  summaryPrompts: PromptTemplate[];
  selectedSummaryPromptId: string;
  isExtractingSummary: boolean;
  hasModel: boolean;
  onOpenSummaryPromptManager: () => void;
  onContentSummaryChange: (contentSummary: string) => void;
  onSummaryPromptChange: (promptId: string) => void;
  onExtractSummary: () => void;
}

export interface ChapterNavigationSectionProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onChapterClick: (chapter: Chapter) => void;
}

export interface WritingSidebarProps {
  characters: Project['characters'];
  activeChapter: Chapter | undefined;
  activeChapterId: string | null;
  chapters: Chapter[];
  summaryPrompts: PromptTemplate[];
  selectedSummaryPromptId: string;
  isExtractingSummary: boolean;
  hasModel: boolean;
  onClose: () => void;
  onChapterSummaryChange: (summary: string) => void;
  onOpenSummaryPromptManager: () => void;
  onContentSummaryChange: (contentSummary: string) => void;
  onSummaryPromptChange: (promptId: string) => void;
  onExtractSummary: () => void;
  onChapterClick: (chapter: Chapter) => void;
}

export interface WritingEditorCanvasProps {
  editorRef: React.RefObject<NovelEditorHandle | null>;
  activeChapterId: string | null;
  content: string;
  isFocusMode: boolean;
  typewriter: boolean;
  isGenerating: boolean;
  isStreaming: boolean;
  isBatchGenerating: boolean;
  targetWordCount: number;
  selectedKnowledgeCount: number;
  streamingContentLength: number;
  batchProgress: BatchProgress;
  onMouseUp: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKeyUp: () => void;
  onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContentChange: (content: string) => void;
  /** Enter×3 连按：宿主创建新章并切换。 */
  onNewChapter?: () => void;
  onStopStreaming: () => void;
  onStopBatchGeneration: () => void;
}

export interface WritingEditModalProps {
  isOpen: boolean;
  selectedText: string;
  editPrompts: PromptTemplate[];
  selectedEditPromptId: string;
  customEditPrompt: string;
  outputMode: OutputMode;
  activeModel: ModelConfig | undefined;
  isStreaming: boolean;
  isGenerating: boolean;
  streamingTokens: TokenUsage;
  traditionalTokens: TokenUsage;
  onClose: () => void;
  onSelectedEditPromptChange: (promptId: string) => void;
  onCustomEditPromptChange: (prompt: string) => void;
  onOutputModeChange: (mode: OutputMode) => void;
  onSubmit: () => void;
}

export interface WritingEditorOverlayLayerProps {
  genModal: GenerationModalState;
  setGenModal: (state: GenerationModalState) => void;
  modalContextInfo: ChapterContextInfo;
  useOutline: boolean;
  setUseOutline: (value: boolean) => void;
  project: Project;
  selectedCharacterIds: Set<string>;
  toggleCharacter: (id: string) => void;
  selectAllCharacters: () => void;
  clearAllCharacters: () => void;
  selectedChapterSummaryIds: Set<string>;
  toggleChapterSummary: (id: string) => void;
  selectAllChapterSummaries: () => void;
  clearAllChapterSummaries: () => void;
  editableSummary: string;
  setEditableSummary: (summary: string) => void;
  selectedKnowledgeIds: Set<string>;
  toggleKnowledge: (id: string) => void;
  selectAllKnowledge: () => void;
  clearAllKnowledge: () => void;
  writingPrompts: PromptTemplate[];
  selectedGenPromptId: string;
  setSelectedGenPromptId: (id: string) => void;
  targetWordCount: number;
  setTargetWordCount: (count: number) => void;
  batchMode: BatchMode;
  setBatchMode: (mode: BatchMode) => void;
  isBatchGenerating: boolean;
  batchProgress: BatchProgress;
  activeModel: ModelConfig | undefined;
  outputMode: OutputMode;
  setOutputMode: (mode: OutputMode) => void;
  isStreaming: boolean;
  streamingTokens: TokenUsage;
  traditionalTokens: TokenUsage;
  isGenerating: boolean;
  handleEnterEditor: () => void;
  handleModalGenerate: () => void;
  stopBatchGeneration: () => void;
  editModalOpen: boolean;
  selectedText: string;
  editPrompts: PromptTemplate[];
  selectedEditPromptId: string;
  customEditPrompt: string;
  onCloseEditModal: () => void;
  onSelectedEditPromptChange: (promptId: string) => void;
  onCustomEditPromptChange: (prompt: string) => void;
  onEditSubmit: () => void;
  exportModalOpen: boolean;
  selectedExportChapterIds: Set<string>;
  exportFormat: ExportFormat;
  onCloseExportModal: () => void;
  onToggleAllExport: () => void;
  onToggleExportChapter: (id: string) => void;
  onExportFormatChange: (format: ExportFormat) => void;
  onConfirmExport: () => void;
  menuPos: MenuPosition | null;
  hasModel: boolean;
  onOpenEditModal: () => void;
  onClearSelection: () => void;
  isHistoryViewerOpen: boolean;
  activeChapter: Chapter | undefined;
  onCloseHistoryViewer: () => void;
  onApplyHistoryContent: (content: string) => void;
  onClearChapterHistory: () => void;
  isGlobalHistorySidebarOpen: boolean;
  onCloseGlobalHistorySidebar: () => void;
  onUpdate: (updates: Partial<Project>) => void;
  onUpdateChapter: (chapter: Chapter) => void;
}
export type AIHistoryViewerMode = 'modal' | 'sidebar';
export type AIHistoryViewMode = 'all' | 'chapter';
export type AIHistorySortBy = 'timestamp' | 'model' | 'tokens';
export type AIHistorySortOrder = 'desc' | 'asc';

export interface AIHistoryRecordWithChapter {
  record: AIHistoryRecord;
  chapter: Chapter;
}

export interface AIHistoryViewerProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
  onClose: () => void;
  mode?: AIHistoryViewerMode;
}

export interface AIHistoryRecordListProps {
  variant: AIHistoryViewerMode;
  records: AIHistoryRecordWithChapter[];
  selectedHistoryIds: Set<string>;
  searchQuery: string;
  viewMode: AIHistoryViewMode;
  selectedChapterId: string | null;
  onToggleSelectAll?: () => void;
  onToggleHistorySelection: (id: string) => void;
  getChapterDisplayTitle: (chapter: Chapter) => string;
}

