import type React from 'react';
import type { ModelProviderInfo } from '../../constants/modelProviders';
import type {
  CardPromptTemplate,
  ConsistencyCheckConfig,
  ConsistencyCheckPromptTemplate,
  EmbeddingModelConfig,
  ModelConfig,
  PromptTemplate,
  StorageConfig,
} from '../../../shared/types';

export interface SettingsModalProps {
  models: ModelConfig[];
  activeModelId: string | null;
  prompts: PromptTemplate[];
  cardPrompts?: CardPromptTemplate[];
  consistencyPrompts?: ConsistencyCheckPromptTemplate[];
  consistencyCheckConfig?: ConsistencyCheckConfig;
  onSaveModels: (models: ModelConfig[], activeId: string) => void;
  onSavePrompts: (prompts: PromptTemplate[]) => void;
  onSaveCardPrompts?: (cardPrompts: CardPromptTemplate[]) => void;
  onSaveConsistencyPrompts?: (prompts: ConsistencyCheckPromptTemplate[]) => void;
  onSaveConsistencyConfig?: (config: ConsistencyCheckConfig) => void;
  onClose: () => void;
  onClearData: () => void;
}

export type SettingsTab = 'models' | 'prompts' | 'card-prompts' | 'consistency-prompts' | 'system' | 'storage' | 'embedding';
export type ImportExportMode = 'import' | 'export';

export interface CardPromptTestResult {
  templateId: string;
  isValid: boolean;
  errors: string[];
}

export interface CardPromptImportResult {
  success: boolean;
  count?: number;
  prompts?: CardPromptTemplate[];
  error?: string;
}

export type EmbeddingQuickAddTemplate = {
  name: string;
  provider: EmbeddingModelConfig['provider'];
  modelName: string;
};
export interface StorageSettingsPanelProps {
  storageConfig: StorageConfig;
  setStorageConfig: React.Dispatch<React.SetStateAction<StorageConfig>>;
  isLoadingStorage: boolean;
  setIsLoadingStorage: React.Dispatch<React.SetStateAction<boolean>>;
  migrationStatus: string;
  setMigrationStatus: React.Dispatch<React.SetStateAction<string>>;
  onClearData: () => void;
}

export interface EmbeddingSettingsPanelProps {
  embeddingConfigs: EmbeddingModelConfig[];
  activeEmbeddingId: string | null;
  embeddingTestingId: string | null;
  embeddingTestResults: Record<string, string>;
  embeddingModelListLoading: Record<string, boolean>;
  addEmbeddingConfig: () => void;
  removeEmbeddingConfig: (id: string) => void;
  updateEmbeddingConfig: (id: string, updates: Partial<EmbeddingModelConfig>) => void;
  testEmbeddingConnection: (config: EmbeddingModelConfig) => void | Promise<void>;
  fetchEmbeddingModelList: (config: EmbeddingModelConfig) => void | Promise<void>;
  setActiveEmbeddingConfig: (id: string) => void;
  quickAddEmbeddingConfig: (template: EmbeddingQuickAddTemplate) => void;
}

export interface ModelSettingsPanelProps {
  localModels: ModelConfig[];
  activeId: string | null;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  testingId: string | null;
  testResults: Record<string, string>;
  modelListLoading: Record<string, boolean>;
  removeModel: (id: string) => void;
  updateModel: (id: string, updates: Partial<ModelConfig>) => void;
  testModel: (model: ModelConfig) => void | Promise<void>;
  fetchModelList: (model: ModelConfig) => void | Promise<void>;
  addModel: () => void;
}

export interface PromptTemplatesPanelProps {
  localPrompts: PromptTemplate[];
  setLocalPrompts: React.Dispatch<React.SetStateAction<PromptTemplate[]>>;
  updatePrompt: (id: string, updates: Partial<PromptTemplate>) => void;
  addPrompt: () => void;
}

export interface CardPromptSettingsPanelProps {
  localCardPrompts: CardPromptTemplate[];
  editingCardPromptId: string | null;
  setEditingCardPromptId: React.Dispatch<React.SetStateAction<string | null>>;
  cardPromptTestResult: CardPromptTestResult | null;
  importExportModalOpen: boolean;
  setImportExportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  importExportMode: ImportExportMode;
  setImportExportMode: React.Dispatch<React.SetStateAction<ImportExportMode>>;
  importText: string;
  setImportText: React.Dispatch<React.SetStateAction<string>>;
  addCardPrompt: () => void;
  removeCardPrompt: (id: string) => void;
  updateCardPrompt: (id: string, updates: Partial<CardPromptTemplate>) => void;
  duplicateCardPrompt: (id: string) => void;
  testCardPrompt: (template: CardPromptTemplate) => boolean;
  exportCardPrompts: () => string;
  importCardPrompts: (jsonString: string) => { success: boolean; count?: number; error?: string };
  resetCardPromptsToDefault: () => void;
}

export interface SystemGuidePanelProps {
  onQuickAddProviderModel: (provider: ModelProviderInfo) => void;
}

export interface ConsistencyPromptSettingsPanelProps {
  templates: ConsistencyCheckPromptTemplate[];
  onTemplatesChange: (templates: ConsistencyCheckPromptTemplate[]) => void;
}

export interface SettingsModalHeaderProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
  onClose: () => void;
}

export interface SettingsModalFooterProps {
  onClose: () => void;
  onSave: () => void | Promise<void>;
}

export interface SettingsTabContentProps {
  activeTab: SettingsTab;
  localModels: ModelConfig[];
  activeId: string | null;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  testingId: string | null;
  testResults: Record<string, string>;
  modelListLoading: Record<string, boolean>;
  removeModel: (id: string) => void;
  updateModel: (id: string, updates: Partial<ModelConfig>) => void;
  testModel: (model: ModelConfig) => void | Promise<void>;
  fetchModelList: (model: ModelConfig) => void | Promise<void>;
  addModel: () => void;
  localPrompts: PromptTemplate[];
  setLocalPrompts: React.Dispatch<React.SetStateAction<PromptTemplate[]>>;
  updatePrompt: (id: string, updates: Partial<PromptTemplate>) => void;
  addPrompt: () => void;
  localCardPrompts: CardPromptTemplate[];
  editingCardPromptId: string | null;
  setEditingCardPromptId: React.Dispatch<React.SetStateAction<string | null>>;
  cardPromptTestResult: CardPromptTestResult | null;
  importExportModalOpen: boolean;
  setImportExportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  importExportMode: ImportExportMode;
  setImportExportMode: React.Dispatch<React.SetStateAction<ImportExportMode>>;
  importText: string;
  setImportText: React.Dispatch<React.SetStateAction<string>>;
  addCardPrompt: () => void;
  removeCardPrompt: (id: string) => void;
  updateCardPrompt: (id: string, updates: Partial<CardPromptTemplate>) => void;
  duplicateCardPrompt: (id: string) => void;
  testCardPrompt: (template: CardPromptTemplate) => boolean;
  exportCardPrompts: () => string;
  importCardPrompts: (jsonString: string) => { success: boolean; count?: number; error?: string };
  resetCardPromptsToDefault: () => void;
  localConsistencyPrompts: ConsistencyCheckPromptTemplate[];
  setLocalConsistencyPrompts: React.Dispatch<React.SetStateAction<ConsistencyCheckPromptTemplate[]>>;
  quickAddProviderModel: (provider: ModelProviderInfo) => void;
  storageConfig: StorageConfig;
  setStorageConfig: React.Dispatch<React.SetStateAction<StorageConfig>>;
  isLoadingStorage: boolean;
  setIsLoadingStorage: React.Dispatch<React.SetStateAction<boolean>>;
  migrationStatus: string;
  setMigrationStatus: React.Dispatch<React.SetStateAction<string>>;
  onClearData: () => void;
  embeddingConfigs: EmbeddingModelConfig[];
  activeEmbeddingId: string | null;
  embeddingTestingId: string | null;
  embeddingTestResults: Record<string, string>;
  embeddingModelListLoading: Record<string, boolean>;
  addEmbeddingConfig: () => void;
  removeEmbeddingConfig: (id: string) => void;
  updateEmbeddingConfig: (id: string, updates: Partial<EmbeddingModelConfig>) => void;
  testEmbeddingConnection: (config: EmbeddingModelConfig) => void | Promise<void>;
  fetchEmbeddingModelList: (config: EmbeddingModelConfig) => void | Promise<void>;
  setActiveEmbeddingConfig: (id: string) => void;
  quickAddEmbeddingConfig: (template: EmbeddingQuickAddTemplate) => void;
}

