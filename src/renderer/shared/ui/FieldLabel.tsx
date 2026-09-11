/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import * as React from 'react';

import { cn } from '../utils/cn';

export interface FieldLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  htmlFor?: string;
}

/** 表单/区块小标题：统一 uppercase tracking 样式，替代各处手写。 */
export const FieldLabel = React.forwardRef<HTMLSpanElement, FieldLabelProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground', className)}
      {...props}
    />
  ),
);
FieldLabel.displayName = 'FieldLabel';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  htmlFor?: string;
  hint?: string;
}

/** 表单字段：标题 + 控件 + 提示。 */
export const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, hint, className, children, ...props }) => (
  <div className={cn('space-y-1.5', className)} {...props}>
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
    >
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);
