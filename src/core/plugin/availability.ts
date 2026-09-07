/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 功能可用性（bundle 运行时强制层，design/04 §7 dogfooding）。
 * 发行档 → assemblyTree → 当前可用的功能 id 集合；UI（导航/入口）以它为准。
 */

import { assemblyTree, BUILTIN_BUNDLES, type Profile } from './bundles.js';

/** 发行档名 → Profile（档名以 bundles.ts 与设置面板为准，无外部 profiles/*.json 文件）。 */
export function profileByName(name: string): Profile {
  switch (name) {
    case 'minimal':
      return { name: 'minimal', plugins: ['com.novalocal.bundle.core'], policies: { 'ai.request': 'deny' } };
    case 'webnovel':
    case 'literary':
    case 'full':
    default:
      // v2.x 的 webnovel/literary 专属 bundle 落地前，与 full 等效
      return { name, plugins: ['com.novalocal.bundle.core', 'com.novalocal.bundle.world', 'com.novalocal.bundle.ai'], policies: {} };
  }
}

/** 当前发行档下可用的功能 id 集合（核心结论：minimal 只剩纯写作链）。 */
export function enabledFeatureIds(profileName: string): Set<string> {
  const rows = assemblyTree(profileByName(profileName), BUILTIN_BUNDLES);
  return new Set(rows.filter((r) => r.enabled).map((r) => r.feature));
}

/** 便捷判断：某功能在当前发行档下是否可用。 */
export function isFeatureEnabled(profileName: string, featureId: string): boolean {
  return enabledFeatureIds(profileName).has(featureId);
}

/** 发行档切换事件名（设置面板派发，UI 订阅刷新）。 */
export const PROFILE_CHANGED_EVENT = 'ai-novel:profile.changed';
