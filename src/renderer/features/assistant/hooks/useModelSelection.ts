/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 助手模型选择（从 GlobalAssistant 抽出）：单源写回 settingsStore，外部变化时跟随。 */
import { useEffect, useState } from 'react';
import { type ModelConfig } from '../../../../shared/types';
import { useSettingsStore } from '@/app/stores/settingsStore';
import { isModelUsable } from '@/shared/utils/modelReadiness';

interface UseModelSelectionOptions {
  models: ModelConfig[];
  activeModelId?: string | null;
}

export function useModelSelection({ models, activeModelId }: UseModelSelectionOptions) {
  const firstEnabledModel = models.find((m) => m.isEnabled !== false) ?? models[0];
  const [currentModelId, setCurrentModelId] = useState<string>(activeModelId || firstEnabledModel?.id || '');

  useEffect(() => {
    if (activeModelId) setCurrentModelId(activeModelId);
  }, [activeModelId]);

  const handleModelChange = (id: string) => {
    setCurrentModelId(id);
    useSettingsStore.getState().setActiveModelId(id);
  };

  // 单源可用模型：三处 AI 入口共用，isEnabled 过滤一致
  const usableModel = models.find((m) => m.id === currentModelId && m.isEnabled !== false)
    ?? models.find((m) => m.isEnabled !== false)
    ?? models[0];
  // 可用 = 已启用 && 已配好凭证：默认模型未填 Key 时按钮禁用，与全屏拦截同口径
  const hasModel = isModelUsable(usableModel);

  return { currentModelId, handleModelChange, usableModel, hasModel };
}
