/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 设置 store（06 篇 §2.2 双 store 划分：设置/元数据切片）。
 *
 * 模型、提示词、一致性模板、外观与语言等低频全局配置；经 persistDiff 的
 * saveSettings 分片差分落盘，与项目 store 的逐书写路径互不阻塞。
 */

import { create } from 'zustand';
import { type AppState, type AppLanguage, type AppTheme, type CardPromptTemplate, type ConsistencyCheckPromptTemplate, type EmbeddingModelConfig, type ModelConfig, type PromptTemplate } from '../../../shared/types';
import { INITIAL_APP_STATE } from '../initialState';
import { changeLanguage } from '../../i18n';
import { applyTheme } from '../../shared/services/themeService';

type ConsistencyConfig = NonNullable<AppState['consistencyCheckConfig']>;

interface SettingsState {
  models: ModelConfig[];
  activeModelId: string | null;
  prompts: PromptTemplate[];
  cardPrompts: CardPromptTemplate[];
  consistencyPrompts: ConsistencyCheckPromptTemplate[];
  consistencyCheckConfig: ConsistencyConfig;
  embeddingModels: EmbeddingModelConfig[];
  activeEmbeddingModelId: string | null;
  language: AppLanguage | undefined;
  theme: AppTheme | undefined;
  /** 从 repository 载入的初始状态整体灌入（首启动/全量导入）。 */
  hydrate: (patch: Partial<SettingsState>) => void;
  setModels: (models: ModelConfig[], activeModelId: string | null) => void;
  setPrompts: (prompts: PromptTemplate[]) => void;
  setCardPrompts: (cardPrompts: CardPromptTemplate[]) => void;
  setConsistencyPrompts: (prompts: ConsistencyCheckPromptTemplate[]) => void;
  setConsistencyConfig: (config: ConsistencyConfig) => void;
  setLanguage: (language: AppLanguage) => void;
  setTheme: (theme: AppTheme) => void;
}

const {
  models: INIT_MODELS,
  activeModelId: INIT_ACTIVE_MODEL_ID,
  prompts: INIT_PROMPTS,
  cardPrompts: INIT_CARD_PROMPTS = [],
  consistencyPrompts: INIT_CONSISTENCY_PROMPTS = [],
  consistencyCheckConfig: INIT_CONSISTENCY_CONFIG = { mode: 'rule', selectedPromptTemplates: {} },
} = INITIAL_APP_STATE;

export const useSettingsStore = create<SettingsState>()((set) => ({
  models: INIT_MODELS,
  activeModelId: INIT_ACTIVE_MODEL_ID,
  prompts: INIT_PROMPTS,
  cardPrompts: INIT_CARD_PROMPTS,
  consistencyPrompts: INIT_CONSISTENCY_PROMPTS,
  consistencyCheckConfig: INIT_CONSISTENCY_CONFIG,
  embeddingModels: [],
  activeEmbeddingModelId: null,
  language: undefined,
  theme: undefined,
  hydrate: (patch) => set(patch),
  setModels: (models, activeModelId) => set({ models, activeModelId }),
  setPrompts: (prompts) => set({ prompts }),
  setCardPrompts: (cardPrompts) => set({ cardPrompts }),
  setConsistencyPrompts: (consistencyPrompts) => set({ consistencyPrompts }),
  setConsistencyConfig: (consistencyCheckConfig) => set({ consistencyCheckConfig }),
  // 外观/语言偏好切换在 store 动作内即时生效（i18n 运行时 + <html> 主题）
  setLanguage: (language) => {
    set({ language });
    changeLanguage(language);
  },
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
  },
}));
