/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './Dialog';
import { cn } from '../utils/cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export interface ModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 标题左侧的图标徽标（如特性图标）。 */
  icon?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  hideClose?: boolean;
  contentClassName?: string;
  children: React.ReactNode;
}

/** 统一模态外壳：标题/描述 + 内容 + 页脚，尺寸走令牌。 */
export const ModalShell: React.FC<ModalShellProps> = ({
  open,
  onOpenChange,
  title,
  description,
  icon,
  size = 'md',
  footer,
  hideClose,
  contentClassName,
  children,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent hideClose={hideClose} className={cn(SIZE[size], contentClassName)}>
      <DialogHeader>
        {icon ? (
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-serif text-lg">{title}</DialogTitle>
              {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
            </div>
          </div>
        ) : (
          <>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </>
        )}
      </DialogHeader>
      {children}
      {footer && <DialogFooter>{footer}</DialogFooter>}
    </DialogContent>
  </Dialog>
);
