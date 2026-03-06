import type React from 'react';
import type { CardPromptTemplate, KnowledgeItem, ModelConfig, Project, PromptTemplate } from '../../../shared/types';

export interface GlobalAssistantProps {
  models: ModelConfig[];
  activeModelId: string | null;
  project: Project | null;
  prompts: PromptTemplate[];
  onUpdate?: (updates: Partial<Project>) => void;
}

export interface ChatTokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: KnowledgeItem[];
  timestamp: number;
  tokens?: ChatTokenUsage;
  model?: string;
  finishReason?: string;
  error?: string;
  isStreaming?: boolean;
}

export type AssistantCategory = 'inspiration' | 'knowledge' | 'characters' | 'outline' | 'chapters';
export type AssistantEditCategory = AssistantCategory | 'content';
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AssistantWindowPosition {
  x: number;
  y: number;
}

export interface AssistantWindowSize {
  width: number;
  height: number;
}

export interface EditingData extends Partial<Project> {
  editingChapterId?: string;
}

export interface AssistantPromptSelection {
  promptId: string;
  templateId: string | null;
}
export interface AssistantEditPanelProps {
  project: Project | null;
  editCategory: AssistantEditCategory;
  editingData: EditingData;
  syncStatus: SyncStatus;
  characterGenerationPrompt: string;
  isGeneratingCharacter: boolean;
  setEditingData: React.Dispatch<React.SetStateAction<EditingData>>;
  setEditCategory: React.Dispatch<React.SetStateAction<AssistantEditCategory>>;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>;
  setEditPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCharacterGenerationPrompt: React.Dispatch<React.SetStateAction<string>>;
  handleOpenEditPanel: (category: AssistantEditCategory) => void;
  handleSaveEdit: () => void;
  handleGenerateCharacter: () => void;
  getChapterContent: (chapterId: string) => string;
}

