/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import type React from 'react';
import type { KnowledgeItem, ModelConfig, Project, PromptTemplate } from '../../../shared/types';

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

