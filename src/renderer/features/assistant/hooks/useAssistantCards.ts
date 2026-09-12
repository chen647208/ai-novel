/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 助手卡片落库（从 GlobalAssistant 抽出）：AI 归因提交 + 未知命令提示。 */
import type { TFunction } from 'i18next';

import { buildCardUpdates } from '@/shared/services/cards/cardApply';
import { dialogService } from '@/shared/services/dialogService';
import { logger } from '@/shared/utils/logger';

import { type AICardCommand, type CreatedCard, type Project } from '../../../../shared/types';

interface UseAssistantCardsOptions {
  project: Project | null;
  updateActiveProject: (updates: Partial<Project>, opts?: { agentId?: string }) => void;
  t: TFunction<'assistant'>;
}

export function useAssistantCards({ project, updateActiveProject, t }: UseAssistantCardsOptions) {
  // AI 产物归因：助手生成的卡片/角色标注来源，用户手改走 onUpdate 默认 user
  const commitAICard = (updates: Partial<Project>) =>
    updateActiveProject(updates, { agentId: 'ai:assistant' });

  const addCardToProject = (command: AICardCommand, data: CreatedCard) => {
    if (!project) return;
    const updates = buildCardUpdates(project, command, data);
    if (!updates) {
      // 未知命令无落库目标：记日志并让调用方感知，避免"审批通过却无事发生"的假闭环
      logger.warn('addCardToProject: 未知卡片命令', command);
      dialogService.alert(t('chat.unknownCommand', { text: `/${command}` as string }));
      return;
    }
    commitAICard(updates);
  };

  return { commitAICard, addCardToProject };
}
