/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { ModelConfig } from '../../../../shared/types';

/**
 * Provider 健康与诊断工具（对标 Cherry Studio errorDiagnosis / SillyTavern Connect 状态点）。
 * 把原来 ModelSettingsPanel 里裸露的 `[ERROR] ...` 字符串升级为可分类、可展示修复建议的结构。
 */

export type ProviderIssueKind = 'auth' | 'quota' | 'rate_limit' | 'network' | 'config' | 'unknown';

export interface ProviderDiagnosis {
  kind: ProviderIssueKind;
  /** 给用户的修复建议（i18n key 由调用方映射，这里只给语义 key） */
  hintKey: string;
}

export function isProviderEnabled(model: ModelConfig): boolean {
  return model.isEnabled !== false;
}

export function maskApiKey(key: string | undefined): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 3)}••••${key.slice(-4)}`;
}

export function classifyProviderError(message: string): ProviderDiagnosis {
  const m = message.toLowerCase();
  if (m.includes('401') || m.includes('unauthorized') || m.includes('invalid api key') || m.includes('incorrect api key')) {
    return { kind: 'auth', hintKey: 'models.diag.auth' };
  }
  if (m.includes('402') || m.includes('billing') || m.includes('quota') || m.includes('insufficient')) {
    return { kind: 'quota', hintKey: 'models.diag.quota' };
  }
  if (m.includes('429') || m.includes('rate limit') || m.includes('too many')) {
    return { kind: 'rate_limit', hintKey: 'models.diag.rateLimit' };
  }
  if (m.includes('fetch failed') || m.includes('network') || m.includes('econn') || m.includes('timeout') || m.includes('failed to fetch')) {
    return { kind: 'network', hintKey: 'models.diag.network' };
  }
  if (m.includes('404') || m.includes('not found') || m.includes('endpoint') || m.includes('base url')) {
    return { kind: 'config', hintKey: 'models.diag.config' };
  }
  return { kind: 'unknown', hintKey: 'models.diag.unknown' };
}

export function isErrorResult(result: string | undefined): boolean {
  return Boolean(result?.startsWith('[ERROR]'));
}
