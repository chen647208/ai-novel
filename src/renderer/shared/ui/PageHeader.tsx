/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import * as React from 'react';
import { cn } from '../utils/cn';

export interface PageHeaderProps {
  /** 左侧标题/主内容区（超宽自动截断） */
  left?: React.ReactNode;
  /** 右侧动作区（统计、工具组、状态） */
  right?: React.ReactNode;
  /** 绝对定位覆盖层（如底边进度细条），不参与 flex 布局 */
  children?: React.ReactNode;
  className?: string;
}

/**
 * 分区页头骨架：单行 h-12，位于应用顶栏（h-14）之下形成层级。
 * 所有分区顶部工具条一律经由本组件，保证同一高度、同一内边距、同一底部分隔线；
 * 禁止换行——空间不足时由调用方通过响应式隐藏次要文字解决。
 */
export function PageHeader({ left, right, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        '@container relative flex h-12 shrink-0 items-center gap-4 overflow-hidden border-b border-border bg-card px-4',
        className
      )}
    >
      {left != null && <div className="flex min-w-0 flex-1 items-center gap-1.5">{left}</div>}
      {right != null && <div className="ml-auto flex shrink-0 items-center gap-1">{right}</div>}
      {children}
    </div>
  );
}

/** 页头动作分组分隔线：统计/编辑/视图等组之间的统一间距元素。 */
export function PageHeaderDivider({ className }: { className?: string }) {
  return <span aria-hidden className={cn('mx-1 h-5 w-px shrink-0 bg-border', className)} />;
}

export interface PageIntroProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 右侧操作区（按钮组等） */
  actions?: React.ReactNode;
}

/** 滚动内容页的大标题区（书架、世界等文档式页面）：标题 + 说明 + 操作区，随内容滚动。 */
export function PageIntro({ title, description, actions, className, ...props }: Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & PageIntroProps) {
  return (
    <div
      className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}
      {...props}
    >
      <div className="min-w-0 text-left">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
