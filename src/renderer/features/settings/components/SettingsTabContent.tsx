import React from 'react';
import CardPromptSettingsPanel from './CardPromptSettingsPanel';
import ConsistencyPromptSettingsPanel from './ConsistencyPromptSettingsPanel';
import EmbeddingSettingsPanel from './EmbeddingSettingsPanel';
import ModelSettingsPanel from './ModelSettingsPanel';
import PromptTemplatesPanel from './PromptTemplatesPanel';
import StorageSettingsPanel from './StorageSettingsPanel';
import SystemGuidePanel from './SystemGuidePanel';
import type { SettingsTabContentProps } from '../types';

const SettingsTabContent: React.FC<SettingsTabContentProps> = ({
  activeTab,
  localModels,
  activeId,
  setActiveId,
  testingId,
  testResults,
  modelListLoading,
  removeModel,
  updateModel,
  testModel,
  fetchModelList,
  addModel,
  localPrompts,
  setLocalPrompts,
  updatePrompt,
  addPrompt,
  localCardPrompts,
  editingCardPromptId,
  setEditingCardPromptId,
  cardPromptTestResult,
  importExportModalOpen,
  setImportExportModalOpen,
  importExportMode,
  setImportExportMode,
  importText,
  setImportText,
  addCardPrompt,
  removeCardPrompt,
  updateCardPrompt,
  duplicateCardPrompt,
  testCardPrompt,
  exportCardPrompts,
  importCardPrompts,
  resetCardPromptsToDefault,
  localConsistencyPrompts,
  setLocalConsistencyPrompts,
  quickAddProviderModel,
  storageConfig,
  setStorageConfig,
  isLoadingStorage,
  setIsLoadingStorage,
  migrationStatus,
  setMigrationStatus,
  onClearData,
  embeddingConfigs,
  activeEmbeddingId,
  embeddingTestingId,
  embeddingTestResults,
  embeddingModelListLoading,
  addEmbeddingConfig,
  removeEmbeddingConfig,
  updateEmbeddingConfig,
  testEmbeddingConnection,
  fetchEmbeddingModelList,
  setActiveEmbeddingConfig,
  quickAddEmbeddingConfig,
}) => {
  return (
    <>
      {activeTab === 'models' && (
        <ModelSettingsPanel
          localModels={localModels}
          activeId={activeId}
          setActiveId={setActiveId}
          testingId={testingId}
          testResults={testResults}
          modelListLoading={modelListLoading}
          removeModel={removeModel}
          updateModel={updateModel}
          testModel={testModel}
          fetchModelList={fetchModelList}
          addModel={addModel}
        />
      )}

      {activeTab === 'prompts' && (
        <PromptTemplatesPanel
          localPrompts={localPrompts}
          setLocalPrompts={setLocalPrompts}
          updatePrompt={updatePrompt}
          addPrompt={addPrompt}
        />
      )}

      {activeTab === 'card-prompts' && (
        <CardPromptSettingsPanel
          localCardPrompts={localCardPrompts}
          editingCardPromptId={editingCardPromptId}
          setEditingCardPromptId={setEditingCardPromptId}
          cardPromptTestResult={cardPromptTestResult}
          importExportModalOpen={importExportModalOpen}
          setImportExportModalOpen={setImportExportModalOpen}
          importExportMode={importExportMode}
          setImportExportMode={setImportExportMode}
          importText={importText}
          setImportText={setImportText}
          addCardPrompt={addCardPrompt}
          removeCardPrompt={removeCardPrompt}
          updateCardPrompt={updateCardPrompt}
          duplicateCardPrompt={duplicateCardPrompt}
          testCardPrompt={testCardPrompt}
          exportCardPrompts={exportCardPrompts}
          importCardPrompts={importCardPrompts}
          resetCardPromptsToDefault={resetCardPromptsToDefault}
        />
      )}

      {activeTab === 'consistency-prompts' && (
        <ConsistencyPromptSettingsPanel
          templates={localConsistencyPrompts}
          onTemplatesChange={setLocalConsistencyPrompts}
        />
      )}

      {activeTab === 'system' && (
        <SystemGuidePanel onQuickAddProviderModel={quickAddProviderModel} />
      )}

      {activeTab === 'storage' && (
        <StorageSettingsPanel
          storageConfig={storageConfig}
          setStorageConfig={setStorageConfig}
          isLoadingStorage={isLoadingStorage}
          setIsLoadingStorage={setIsLoadingStorage}
          migrationStatus={migrationStatus}
          setMigrationStatus={setMigrationStatus}
          onClearData={onClearData}
        />
      )}

      {activeTab === 'embedding' && (
        <EmbeddingSettingsPanel
          embeddingConfigs={embeddingConfigs}
          activeEmbeddingId={activeEmbeddingId}
          embeddingTestingId={embeddingTestingId}
          embeddingTestResults={embeddingTestResults}
          embeddingModelListLoading={embeddingModelListLoading}
          addEmbeddingConfig={addEmbeddingConfig}
          removeEmbeddingConfig={removeEmbeddingConfig}
          updateEmbeddingConfig={updateEmbeddingConfig}
          testEmbeddingConnection={testEmbeddingConnection}
          fetchEmbeddingModelList={fetchEmbeddingModelList}
          setActiveEmbeddingConfig={setActiveEmbeddingConfig}
          quickAddEmbeddingConfig={quickAddEmbeddingConfig}
        />
      )}
    </>
  );
};

export default SettingsTabContent;
