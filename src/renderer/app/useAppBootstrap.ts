/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 应用引导 hook：首启动加载 → 双 store 灌入 → 持久化桥启动 → 主题/语言联动。
 * App.tsx 只消费返回值，不再持有数据加载与持久化细节。
 */

import { useEffect } from 'react';
import { INITIAL_APP_STATE } from './initialState';
import { repository } from '../shared/services/repository';
import { changeLanguage } from '../i18n';
import { vectorIntegrationService } from '../features/knowledge/services/vectorIntegrationService';
import { applyTheme, watchSystemTheme } from '../shared/services/themeService';
import { logger } from '../shared/utils/logger';
import { useProjectStore } from './stores/projectStore';
import { useSettingsStore } from './stores/settingsStore';
import { bootCustomFonts } from '../features/settings/services/customFontService';
import { composeAppState, seedPersistBaseline, startPersistenceBridge } from './stores/persistenceBridge';

/** 把规范化 AppState 灌入双 store（首启动与全量导入共用）。 */
export function hydrateStoresFromState(state: typeof INITIAL_APP_STATE): void {
  useProjectStore.getState().hydrate(state.projects, state.activeProjectId);
  useSettingsStore.getState().hydrate({
    models: state.models,
    activeModelId: state.activeModelId,
    prompts: state.prompts,
    cardPrompts: state.cardPrompts ?? [],
    consistencyPrompts: state.consistencyPrompts ?? INITIAL_APP_STATE.consistencyPrompts ?? [],
    consistencyCheckConfig: state.consistencyCheckConfig ?? INITIAL_APP_STATE.consistencyCheckConfig
      ?? { mode: 'rule', selectedPromptTemplates: {} },
    embeddingModels: state.embeddingModels,
    activeEmbeddingModelId: state.activeEmbeddingModelId,
    language: state.language,
    theme: state.theme,
    uiFont: state.uiFont,
    editorFont: state.editorFont,
    customFonts: state.customFonts ?? [],
  });
}

export function useAppBootstrap(): void {
  const theme = useSettingsStore(s => s.theme);

  useEffect(() => {
    void (async () => {
      try {
        // 后端初始化（SQLite 建表迁移 + 首启从旧 JSON 导入）；JSON 后端无此步
        await repository.init?.();
        const saved = await repository.loadAll();
        if (saved) {
          logger.debug('成功加载应用状态，应用数据迁移');
          const loaded = { ...INITIAL_APP_STATE, ...saved,
            embeddingModels: saved.embeddingModels || [],
            activeEmbeddingModelId: saved.activeEmbeddingModelId || null,
          };
          hydrateStoresFromState(loaded);
          if (loaded.language) changeLanguage(loaded.language);
          applyTheme(loaded.theme);
        } else {
          logger.debug('没有找到保存的状态，使用初始状态');
        }
        // 建立差分基线（磁盘现状 == 组合态），再启动持久化桥
        seedPersistBaseline(composeAppState());
        // 已导入字体读回注册（逐个失败跳过，不挡启动）
        void bootCustomFonts().catch((error) => logger.error('自定义字体加载失败:', error));
        await vectorIntegrationService.initialize();
        startPersistenceBridge();
      } catch (error) {
        logger.error('Failed to load initial state:', error);
      }
    })();
  }, []);

  // 偏好为 system 时跟随系统深浅变化（切换瞬时生效由 setTheme 动作完成）
  useEffect(() => {
    if ((theme ?? 'light') !== 'system') return;
    return watchSystemTheme(() => applyTheme('system'));
  }, [theme]);
}
