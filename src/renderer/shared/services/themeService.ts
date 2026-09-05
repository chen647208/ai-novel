/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
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

/** 把主题应用到 <html>，返回生效值。
 * 令牌用 light-dark() 定义在 @theme 里，其取值取决于元素的 color-scheme；
 * 而本项目的 Lightning CSS 会把 .dark{color-scheme:dark} 这类「仅含普通属性、
 * 未被生成选择器引用」的规则裁掉，故这里直接用内联 style.colorScheme 驱动切换
 * （内联样式优先级最高、必然生效），同时保留 .dark 类供 dark: 工具类与语义使用。 */
export function applyTheme(theme: AppTheme | undefined | null): ResolvedTheme {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
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
