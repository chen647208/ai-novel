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
import { Spinner } from './Spinner';

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
}

/** 加载态占位：居中 spinner + 可选文案。 */
export const LoadingState: React.FC<LoadingStateProps> = ({ label, className, ...props }) => (
  <div
    role="status"
    className={cn('flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground', className)}
    {...props}
  >
    <Spinner className="size-5" />
    {label && <span>{label}</span>}
  </div>
);
