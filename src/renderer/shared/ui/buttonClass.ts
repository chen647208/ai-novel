/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 按钮语义类的纯组合函数——不依赖 DOM，可单测。
 * 视觉真值在 index.css 的 @layer components（.btn / .btn-* ），这里只负责按语义挑选拼接。
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 占满父容器宽度 */
  block?: boolean;
  /** 追加的自定义类，置于末尾以便覆盖 */
  className?: string;
}

export function buttonClass(options: ButtonClassOptions = {}): string {
  const { variant = 'primary', size = 'md', block = false, className } = options;
  const parts = ['btn', `btn-${variant}`, `btn-${size}`];
  if (block) parts.push('btn-block');
  if (className) parts.push(className);
  return parts.join(' ');
}
