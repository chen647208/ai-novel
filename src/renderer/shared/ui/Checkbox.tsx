/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import * as React from 'react';
import { cn } from '../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** 行内标签；提供后点击文字可切换。 */
  label?: React.ReactNode;
}

/** 统一复选框：令牌配色与焦点环；带 label 时渲染为可点行。 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          'size-4 shrink-0 cursor-pointer rounded border-input accent-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
    if (label === undefined) return input;
    return (
      <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm">
        {input}
        <span>{label}</span>
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
