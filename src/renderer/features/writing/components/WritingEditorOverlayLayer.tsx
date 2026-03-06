import React from 'react';
import AIHistoryViewer from '../AIHistoryViewer';
import ChapterGenerationModal from './ChapterGenerationModal';
import ChapterHistoryModal from './ChapterHistoryModal';
import ExportChapterModal from './ExportChapterModal';
import WritingEditModal from './WritingEditModal';
import WritingSelectionMenu from './WritingSelectionMenu';
import type { WritingEditorOverlayLayerProps } from '../types';

const WritingEditorOverlayLayer: React.FC<WritingEditorOverlayLayerProps> = ({
  genModal,
  setGenModal,
  modalContextInfo,
  useOutline,
  setUseOutline,
  project,
  selectedCharacterIds,
  toggleCharacter,
  selectAllCharacters,
  clearAllCharacters,
  selectedChapterSummaryIds,
  toggleChapterSummary,
  selectAllChapterSummaries,
  clearAllChapterSummaries,
  editableSummary,
  setEditableSummary,
  selectedKnowledgeIds,
  toggleKnowledge,
  selectAllKnowledge,
  clearAllKnowledge,
  writingPrompts,
  selectedGenPromptId,
  setSelectedGenPromptId,
  targetWordCount,
  setTargetWordCount,
  batchMode,
  setBatchMode,
  isBatchGenerating,
  batchProgress,
  activeModel,
  outputMode,
  setOutputMode,
  isStreaming,
  streamingTokens,
  traditionalTokens,
  isGenerating,
  handleEnterEditor,
  handleModalGenerate,
  stopBatchGeneration,
  editModalOpen,
  selectedText,
  editPrompts,
  selectedEditPromptId,
  customEditPrompt,
  onCloseEditModal,
  onSelectedEditPromptChange,
  onCustomEditPromptChange,
  onEditSubmit,
  exportModalOpen,
  selectedExportChapterIds,
  onCloseExportModal,
  onToggleAllExport,
  onToggleExportChapter,
  onConfirmExport,
  menuPos,
  onOpenEditModal,
  onClearSelection,
  isHistoryViewerOpen,
  activeChapter,
  onCloseHistoryViewer,
  onApplyHistoryContent,
  onClearChapterHistory,
  isGlobalHistorySidebarOpen,
  onCloseGlobalHistorySidebar,
  onUpdate,
}) => {
  return (
    <>
      <ChapterGenerationModal
        genModal={genModal}
        setGenModal={setGenModal}
        modalContextInfo={modalContextInfo}
        useOutline={useOutline}
        setUseOutline={setUseOutline}
        project={project}
        selectedCharacterIds={selectedCharacterIds}
        toggleCharacter={toggleCharacter}
        selectAllCharacters={selectAllCharacters}
        clearAllCharacters={clearAllCharacters}
        selectedChapterSummaryIds={selectedChapterSummaryIds}
        toggleChapterSummary={toggleChapterSummary}
        selectAllChapterSummaries={selectAllChapterSummaries}
        clearAllChapterSummaries={clearAllChapterSummaries}
        editableSummary={editableSummary}
        setEditableSummary={setEditableSummary}
        selectedKnowledgeIds={selectedKnowledgeIds}
        toggleKnowledge={toggleKnowledge}
        selectAllKnowledge={selectAllKnowledge}
        clearAllKnowledge={clearAllKnowledge}
        writingPrompts={writingPrompts}
        selectedGenPromptId={selectedGenPromptId}
        setSelectedGenPromptId={setSelectedGenPromptId}
        targetWordCount={targetWordCount}
        setTargetWordCount={setTargetWordCount}
        batchMode={batchMode}
        setBatchMode={setBatchMode}
        isBatchGenerating={isBatchGenerating}
        batchProgress={batchProgress}
        activeModel={activeModel}
        outputMode={outputMode}
        setOutputMode={setOutputMode}
        isStreaming={isStreaming}
        streamingTokens={streamingTokens}
        traditionalTokens={traditionalTokens}
        isGenerating={isGenerating}
        handleEnterEditor={handleEnterEditor}
        handleModalGenerate={handleModalGenerate}
        stopBatchGeneration={stopBatchGeneration}
      />

      <WritingEditModal
        isOpen={editModalOpen}
        selectedText={selectedText}
        editPrompts={editPrompts}
        selectedEditPromptId={selectedEditPromptId}
        customEditPrompt={customEditPrompt}
        outputMode={outputMode}
        activeModel={activeModel}
        isStreaming={isStreaming}
        isGenerating={isGenerating}
        streamingTokens={streamingTokens}
        traditionalTokens={traditionalTokens}
        onClose={onCloseEditModal}
        onSelectedEditPromptChange={onSelectedEditPromptChange}
        onCustomEditPromptChange={onCustomEditPromptChange}
        onOutputModeChange={setOutputMode}
        onSubmit={onEditSubmit}
      />

      <ExportChapterModal
        isOpen={exportModalOpen}
        chapters={project.chapters}
        selectedChapterIds={selectedExportChapterIds}
        onClose={onCloseExportModal}
        onToggleAll={onToggleAllExport}
        onToggleChapter={onToggleExportChapter}
        onConfirm={onConfirmExport}
      />

      <WritingSelectionMenu
        menuPos={menuPos}
        isEditModalOpen={editModalOpen}
        onOpenEditModal={onOpenEditModal}
        onClearSelection={onClearSelection}
      />

      <ChapterHistoryModal
        isOpen={isHistoryViewerOpen}
        chapter={activeChapter}
        onClose={onCloseHistoryViewer}
        onApplyContent={onApplyHistoryContent}
        onClearHistory={onClearChapterHistory}
      />

      {isGlobalHistorySidebarOpen && (
        <AIHistoryViewer
          project={project}
          onUpdate={onUpdate}
          onClose={onCloseGlobalHistorySidebar}
          mode="sidebar"
        />
      )}
    </>
  );
};

export default WritingEditorOverlayLayer;
