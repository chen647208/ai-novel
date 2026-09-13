/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 界面功能开关（用户级）：每个可选界面/入口一个 id，默认开启；关闭后入口不渲染。
 * 与发行档（profile）叠加：发行档决定能力是否编译进产品，本开关决定用户是否使用。
 */
import { STORAGE_KEYS } from '@shared/constants/storageKeys';

import { localStore } from '@/shared/services/localStore';

export type ToggleableFeatureId =
  | 'panel.assistant'
  | 'panel.globalSearch'
  | 'panel.worldGraph'
  | 'panel.consistency'
  | 'panel.smartRecommender'
  | 'panel.enhancedTimeline'
  | 'panel.dataViews'
  | 'panel.dualTimeline'
  | 'panel.screenplay';

export type FeatureLabelKey =
  | 'features.assistant'
  | 'features.globalSearch'
  | 'features.worldGraph'
  | 'features.consistency'
  | 'features.smartRecommender'
  | 'features.enhancedTimeline'
  | 'features.dataViews'
  | 'features.dualTimeline'
  | 'features.screenplay';

export interface ToggleableFeature {
  id: ToggleableFeatureId;
  /** settings 命名空间下的 i18n 键。 */
  labelKey: FeatureLabelKey;
}

export const TOGGLEABLE_FEATURES: readonly ToggleableFeature[] = [
  { id: 'panel.assistant', labelKey: 'features.assistant' },
  { id: 'panel.globalSearch', labelKey: 'features.globalSearch' },
  { id: 'panel.worldGraph', labelKey: 'features.worldGraph' },
  { id: 'panel.consistency', labelKey: 'features.consistency' },
  { id: 'panel.smartRecommender', labelKey: 'features.smartRecommender' },
  { id: 'panel.enhancedTimeline', labelKey: 'features.enhancedTimeline' },
  { id: 'panel.dataViews', labelKey: 'features.dataViews' },
  { id: 'panel.dualTimeline', labelKey: 'features.dualTimeline' },
  { id: 'panel.screenplay', labelKey: 'features.screenplay' },
];

const listeners = new Set<() => void>();

function readDisabled(): Set<string> {
  try {
    const raw = localStore.getItem(STORAGE_KEYS.appFeaturesDisabled);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []);
  } catch {
    return new Set();
  }
}

let disabled: ReadonlySet<string> = readDisabled();
let cache: readonly string[] = [...disabled];

function notify(): void {
  cache = [...disabled];
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // 单个订阅者异常不影响其余
    }
  }
}

export function subscribeFeatureToggles(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDisabledFeatures(): readonly string[] {
  return cache;
}

/** 功能是否开启（默认开启；关闭即禁用）。 */
export function isFeatureEnabled(id: ToggleableFeatureId): boolean {
  return !disabled.has(id);
}

export function setFeatureEnabled(id: ToggleableFeatureId, enabled: boolean): void {
  const next = new Set(disabled);
  if (enabled) next.delete(id);
  else next.add(id);
  disabled = next;
  localStore.setItem(STORAGE_KEYS.appFeaturesDisabled, JSON.stringify([...next]));
  notify();
}
