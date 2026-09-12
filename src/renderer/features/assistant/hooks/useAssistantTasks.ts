/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 订阅助手后台任务列表（状态栏指示器与聊天编排共用）。 */
import { useSyncExternalStore } from 'react';

import { assistantTaskService, type AssistantTaskView } from '../services/assistantTaskService';

export function useAssistantTasks(): AssistantTaskView[] {
  return useSyncExternalStore(assistantTaskService.subscribe, assistantTaskService.getSnapshot, assistantTaskService.getSnapshot);
}
