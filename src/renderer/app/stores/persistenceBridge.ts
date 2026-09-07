/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 双 store → repository 持久化桥（06 篇 §2.2）。
 *
 * 组合设置/项目两个 store 为逻辑 AppState，任一 store 变化即走 persistDiff
 * 差分落盘（逐书/逐设置分片），再按存储子系统配置触发自动备份。
 * 基线由首启动 hydrate 建立：磁盘现状 == 刚载入的组合态，首帧不整体重写。
 */

import { type AppState } from '../../../shared/types';
import { repository } from '../../shared/services/repository';
import { autoBackupService } from '../../shared/services/autoBackupService';
import { logger } from '../../shared/utils/logger';
import { persistDiff } from '../persistDiff';
import { useProjectStore, commitMetaOf } from './projectStore';
import { useSettingsStore } from './settingsStore';

/** 把两个 store 的当前值组合为逻辑 AppState（供导出/一致性哨兵使用）。 */
export function composeAppState(): AppState {
  const p = useProjectStore.getState();
  const s = useSettingsStore.getState();
  return {
    projects: p.projects,
    activeProjectId: p.activeProjectId,
    models: s.models,
    prompts: s.prompts,
    activeModelId: s.activeModelId,
    embeddingModels: s.embeddingModels,
    activeEmbeddingModelId: s.activeEmbeddingModelId,
    cardPrompts: s.cardPrompts,
    consistencyPrompts: s.consistencyPrompts,
    consistencyCheckConfig: s.consistencyCheckConfig,
    language: s.language,
    theme: s.theme,
    uiFont: s.uiFont,
    editorFont: s.editorFont,
    customFonts: s.customFonts,
  };
}

let lastPersisted: AppState | null = null;
let started = false;
let flushing = false;

/** 建立差分基线（首启动 hydrate 后调用；base 即磁盘现状的组合态）。 */
export function seedPersistBaseline(base: AppState | null): void {
  lastPersisted = base;
}

async function flush(): Promise<void> {
  if (flushing) return; // 上一次差分未落盘前不再叠加（同一事件循环内的合并更新只会触发一次）
  flushing = true;
  try {
    const next = composeAppState();
    const prev = lastPersisted;
    lastPersisted = next;
    if (prev === null) {
      await repository.saveAll(next);
    } else {
      // 归因随新引用绑定传入（WeakMap）：AI 落笔帧带 agentId/cause，手写帧无绑定即 user
      await persistDiff(repository, prev, next, commitMetaOf);
    }
    const config = await repository.getStorageConfig();
    if (config.autoBackupEnabled) {
      await autoBackupService.performBackup(config, () => composeAppState());
    }
  } catch (error) {
    logger.error('持久化或自动备份失败:', error);
  } finally {
    flushing = false;
  }
}

/**
 * 订阅双 store 启动差分持久化。幂等：App 生命周期内只启动一次。
 * 返回解绑函数（测试用）。
 */
export function startPersistenceBridge(): () => void {
  if (started) return () => undefined;
  started = true;
  const unsubs = [
    useProjectStore.subscribe(() => void flush()),
    useSettingsStore.subscribe(() => void flush()),
  ];
  return () => {
    unsubs.forEach((u) => u());
    started = false;
  };
}

/** 一致性哨兵：磁盘差分应该只由 store 变化驱动；测试与诊断读取上次落盘快照。 */
export function getLastPersistedSnapshot(): AppState | null {
  return lastPersisted;
}
