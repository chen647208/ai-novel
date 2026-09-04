/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { type AppState } from '../../shared/types';
import { DEFAULT_PROMPTS, INITIAL_MODELS } from '../../shared/constants';
import { getDefaultConsistencyPrompts } from '../constants/consistencyCheck';

export const INITIAL_APP_STATE: AppState = {
  projects: [],
  activeProjectId: null,
  models: INITIAL_MODELS,
  prompts: DEFAULT_PROMPTS,
  activeModelId: 'default-deepseek',
  embeddingModels: [],
  activeEmbeddingModelId: null,
  cardPrompts: [],
  consistencyPrompts: getDefaultConsistencyPrompts(),
  consistencyCheckConfig: {
    mode: 'rule',
    selectedPromptTemplates: {},
  },
};

export type ResetModalState = {
  isOpen: boolean;
  type: 'clear_projects' | 'factory_reset' | null;
};

/**
 * 将外部导入的原始状态规范化为一个结构完整、可安全使用的 AppState。
 *
 * 从 App 的“导入全部数据”内联逻辑中抽取而来，使其成为可独立测试的纯函数。
 * 逐字段做类型守卫并回退到默认值；同时保证 activeProjectId 指向一个真实存在的项目。
 *
 * 修复：旧的内联实现只搬运了 7 个字段，导入时会静默丢弃 cardPrompts /
 * consistencyPrompts / consistencyCheckConfig，与“覆盖所有数据”的意图相悖。
 * 这里一并透传这三项（缺失时回退到初始默认值）。
 */
export const normalizeImportedState = (imported: Partial<AppState> | null | undefined): AppState => {
  const src = imported ?? {};
  const projects = Array.isArray(src.projects) ? src.projects : [];

  let activeProjectId = src.activeProjectId || null;
  if (projects.length === 0) {
    activeProjectId = null;
  } else if (!activeProjectId || !projects.some(p => p.id === activeProjectId)) {
    activeProjectId = projects[0]?.id ?? null;
  }

  return {
    projects,
    activeProjectId,
    models: Array.isArray(src.models) ? src.models : INITIAL_APP_STATE.models,
    prompts: Array.isArray(src.prompts) ? src.prompts : INITIAL_APP_STATE.prompts,
    activeModelId: src.activeModelId || 'default-deepseek',
    embeddingModels: Array.isArray(src.embeddingModels) ? src.embeddingModels : [],
    activeEmbeddingModelId: src.activeEmbeddingModelId || null,
    cardPrompts: Array.isArray(src.cardPrompts) ? src.cardPrompts : INITIAL_APP_STATE.cardPrompts,
    consistencyPrompts: Array.isArray(src.consistencyPrompts) ? src.consistencyPrompts : INITIAL_APP_STATE.consistencyPrompts,
    consistencyCheckConfig: src.consistencyCheckConfig ?? INITIAL_APP_STATE.consistencyCheckConfig,
    language: src.language === 'zh' || src.language === 'en' ? src.language : INITIAL_APP_STATE.language,
  };
};




