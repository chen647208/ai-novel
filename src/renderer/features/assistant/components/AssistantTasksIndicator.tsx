/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 助手后台任务指示器（顶栏）：显示排队/运行中的会话任务，可逐条中止、清理已结束记录。 */
import { CheckCircle2, CircleAlert, Loader2, XCircle } from 'lucide-react';
import React from 'react';

import { useTranslation } from '@/i18n';
import { Button } from '@/shared/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu';

import { useAssistantTasks } from '../hooks/useAssistantTasks';
import { assistantTaskService, type AssistantTaskStatus } from '../services/assistantTaskService';

const StatusIcon: React.FC<{ status: AssistantTaskStatus }> = ({ status }) => {
  if (status === 'queued' || status === 'running') return <Loader2 className="size-4 shrink-0 animate-spin text-primary" />;
  if (status === 'done') return <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />;
  if (status === 'aborted') return <XCircle className="size-4 shrink-0 text-muted-foreground" />;
  return <CircleAlert className="size-4 shrink-0 text-destructive" />;
};

const AssistantTasksIndicator: React.FC = () => {
  const { t } = useTranslation('assistant');
  const tasks = useAssistantTasks();
  if (tasks.length === 0) return null;

  const active = tasks.filter((task) => task.status === 'queued' || task.status === 'running').length;
  const finished = tasks.length - active;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          title={active > 0 ? t('tasks.runningTip', { count: active }) : t('tasks.title')}
        >
          {active > 0 ? <Loader2 className="size-4 animate-spin text-primary" /> : <CheckCircle2 className="size-4 text-muted-foreground" />}
          <span className="tabular-nums">{active > 0 ? t('tasks.count', { count: active }) : t('tasks.doneCount', { count: finished })}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>{t('tasks.title')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tasks.map((task) => {
          const isActive = task.status === 'queued' || task.status === 'running';
          return (
            <DropdownMenuItem
              key={task.id}
              className="gap-2"
              onSelect={(event) => {
                if (isActive) {
                  event.preventDefault();
                  assistantTaskService.abort(task.id);
                }
              }}
            >
              <StatusIcon status={task.status} />
              <span className="min-w-0 flex-1 truncate">{task.label || t('tasks.untitled')}</span>
              {isActive ? (
                <span className="shrink-0 text-xs text-muted-foreground">{t('tasks.abort')}</span>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">{t(`tasks.status.${task.status}`)}</span>
              )}
            </DropdownMenuItem>
          );
        })}
        {finished > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => assistantTaskService.clearFinished()}>{t('tasks.clear')}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AssistantTasksIndicator;
