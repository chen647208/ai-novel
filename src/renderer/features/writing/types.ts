import type React from 'react';
import type { AIHistoryRecord, Chapter, ModelConfig, OutputMode, Project, PromptTemplate } from '../../../shared/types';

export interface WritingEditorProps {
  project: Project;
  prompts: PromptTemplate[];
  activeModel: ModelConfig;
  onUpdate: (updates: Partial<Project>) => void;
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
  activeModel: ModelConfig;
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
  wordCount: number;
  lastSaved: number;
  onBack: () => void;
  onTitleChange: (title: string) => void;
  onOpenExport: () => void;
  onClearContent: () => void;
  onToggleGlobalHistory: () => void;
  onOpenChapterHistory: () => void;
  onOpenSidebar: () => void;
}

export interface WritingSelectionMenuProps {
  menuPos: MenuPosition | null;
  isEditModalOpen: boolean;
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
  onClose: () => void;
  onChapterSummaryChange: (summary: string) => void;
  onOpenSummaryPromptManager: () => void;
  onContentSummaryChange: (contentSummary: string) => void;
  onSummaryPromptChange: (promptId: string) => void;
  onExtractSummary: () => void;
  onChapterClick: (chapter: Chapter) => void;
}

export interface WritingEditorCanvasProps {
  textRef: React.RefObject<HTMLTextAreaElement | null>;
  activeChapterId: string | null;
  content: string;
  isGenerating: boolean;
  isStreaming: boolean;
  isBatchGenerating: boolean;
  targetWordCount: number;
  selectedKnowledgeCount: number;
  streamingContentLength: number;
  batchProgress: BatchProgress;
  onMouseUp: (event: React.MouseEvent<HTMLTextAreaElement>) => void;
  onKeyUp: () => void;
  onMouseMove: (event: React.MouseEvent<HTMLTextAreaElement>) => void;
  onContentChange: (content: string) => void;
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
  activeModel: ModelConfig;
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
  activeModel: ModelConfig;
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
  onCloseExportModal: () => void;
  onToggleAllExport: () => void;
  onToggleExportChapter: (id: string) => void;
  onConfirmExport: () => void;
  menuPos: MenuPosition | null;
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

