/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import * as React from 'react';
import { Button, type ButtonProps } from './Button';
import { cn } from '../utils/cn';

export type IconButtonTone = 'default' | 'muted' | 'danger';

const TONE: Record<IconButtonTone, string> = {
  default: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  muted: 'text-muted-foreground hover:text-foreground',
  danger: 'text-muted-foreground hover:text-destructive',
};

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'variant'> {
  tone?: IconButtonTone;
  /** 激活态（如面板已展开）。 */
  active?: boolean;
  label: string;
}

/** 图标按钮：方形幽灵按钮 + tone/激活态，label 落 aria-label 与 title。 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ tone = 'default', active, label, className, children, ...rest }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn('size-8', TONE[tone], active && 'bg-primary/10 text-primary', className)}
      {...rest}
    >
      {children}
    </Button>
  ),
);
IconButton.displayName = 'IconButton';
