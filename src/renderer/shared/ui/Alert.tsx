/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const TONE: Record<AlertTone, { classes: string; Icon: typeof Info }> = {
  info: { classes: 'border-primary/20 bg-primary/5 text-foreground', Icon: Info },
  success: { classes: 'border-success/20 bg-success/5 text-foreground', Icon: CheckCircle2 },
  warning: { classes: 'border-warning/30 bg-warning/10 text-foreground', Icon: AlertTriangle },
  error: { classes: 'border-destructive/20 bg-destructive/5 text-foreground', Icon: XCircle },
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title?: string;
}

/** 统一提示条（info/success/warning/error），替代各处手写横幅。 */
export const Alert: React.FC<AlertProps> = ({ tone = 'info', title, className, children, ...props }) => {
  const { classes, Icon } = TONE[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed', classes, className)}
      {...props}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0">
        {title && <div className="font-medium">{title}</div>}
        {children}
      </div>
    </div>
  );
};
