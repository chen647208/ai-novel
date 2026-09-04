/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import type { AppTheme } from '@shared/types';

export type ResolvedTheme = 'light' | 'dark';

/** 系统是否偏好深色。matchMedia 不可用（测试环境等）时按浅色处理。 */
export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 解析用户主题偏好为实际生效主题；未设置默认浅色。 */
export function resolveTheme(theme: AppTheme | undefined | null): ResolvedTheme {
  if (theme === 'dark') return 'dark';
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return 'light';
}

/** 把主题应用到 <html>（.dark 类驱动全部 CSS 令牌切换），返回生效值。 */
export function applyTheme(theme: AppTheme | undefined | null): ResolvedTheme {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

/** 监听系统主题变化；返回清理函数。仅在偏好为 system 时有意义。 */
export function watchSystemTheme(onChange: (resolved: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange(mq.matches ? 'dark' : 'light');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
