/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { buttonClass, type ButtonVariant, type ButtonSize } from './buttonClass';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 占满父容器宽度 */
  block?: boolean;
}

/**
 * 全局语义按钮：变体/尺寸映射到 index.css 的 .btn-* 组件类。
 * 默认 type="button"，避免在表单里误触发提交；透传其余原生属性。
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, block, className, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} className={buttonClass({ variant, size, block, className })} {...rest} />
  )
);
Button.displayName = 'Button';
