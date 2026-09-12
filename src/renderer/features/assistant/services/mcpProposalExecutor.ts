/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * MCP 提案执行器：外部 agent 的写提案经用户批准后真实落库。
 *
 * 章节写按节点 id（与章节 id 同源）定位，先补快照再覆写正文；
 * 卡片写先走卡片命令解析（与斜杠命令同管线），失败回落知识库追加（不丢字）；
 * 全程标注 agentId 'ai:mcp'，与内置 Agent 同权同源。
 */
import type { McpProposalExec } from '@core/ai';
import type {
  AICardCommand,
  Character,
  CreatedCard,
  Faction,
  Location,
  MagicSystem,
  Project,
  RuleSystem,
  TechnologyLevel,
  Timeline,
  TimelineEvent,
  WorldHistory,
  WorldView,
} from '@shared/types';

import { useProjectStore } from '@/app/stores/projectStore';
import { useSettingsStore } from '@/app/stores/settingsStore';
import { AICardCreationService } from '@/shared/services/cards/aiCardCreationService';
import { appendSnapshot, createSnapshot } from '@/shared/services/chapterSnapshotService';
import { isModelUsable } from '@/shared/utils/modelReadiness';

export interface McpExecResult {
  ok: boolean;
  /** 落库说明（书名/章节/卡片去向），成功提示用 */
  applied?: string;
  error?: string;
}

/** 卡片创建结果落到项目对应数组（与 GlobalAssistant 卡片回写同口径）。 */
function applyCreatedCard(project: Project, command: AICardCommand, data: CreatedCard): Partial<Project> {
  switch (command) {
    case 'character':
      return { characters: [...(project.characters ?? []), data as Character] };
    case 'location':
      return { locations: [...(project.locations ?? []), data as Location] };
    case 'faction':
      return { factions: [...(project.factions ?? []), data as Faction] };
    case 'timeline':
    case 'event':
      return {
        timeline: {
          ...(project.timeline ?? { id: `tl-${Date.now()}`, projectId: project.id, config: { calendarSystem: 'default' }, events: [], createdAt: Date.now(), updatedAt: Date.now() }),
          events: [...(project.timeline?.events ?? []), data as TimelineEvent],
        } as Timeline,
      };
    case 'rule':
      return { ruleSystems: [...(project.ruleSystems ?? []), data as RuleSystem] };
    case 'magic':
      return { worldView: { ...(project.worldView ?? { id: `wv-${Date.now()}`, projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }), magicSystem: data as MagicSystem } as WorldView };
    case 'tech':
      return { worldView: { ...(project.worldView ?? { id: `wv-${Date.now()}`, projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }), technologyLevel: data as TechnologyLevel } as WorldView };
    case 'history':
      return { worldView: { ...(project.worldView ?? { id: `wv-${Date.now()}`, projectId: project.id, createdAt: Date.now(), updatedAt: Date.now() }), history: data as WorldHistory } as WorldView };
    default:
      return {};
  }
}

function usableModel() {
  const s = useSettingsStore.getState();
  const active = s.models.find((m) => m.id === s.activeModelId);
  if (isModelUsable(active)) return active;
  return s.models.find((m) => isModelUsable(m));
}

export async function executeMcpProposal(exec: McpProposalExec, proposalId: string): Promise<McpExecResult> {
  const store = useProjectStore.getState();
  const opts = { agentId: 'ai:mcp', cause: proposalId } as const;

  if (exec.kind === 'chapter-write') {
    if (!exec.nodeId) return { ok: false, error: '提案缺少目标章节 id（nodeId），已保留待审' };
    const target =
      store.projects.find((p) => p.id === exec.bookId) ??
      store.projects.find((p) => (p.chapters ?? []).some((c) => c.id === exec.nodeId));
    if (!target) return { ok: false, error: '未找到目标书籍（可能已被删除），已保留待审' };
    const chapter = target.chapters.find((c) => c.id === exec.nodeId);
    if (!chapter) return { ok: false, error: `书籍《${target.title}》中没有该章节，已保留待审` };
    // 切到目标书再落库（用户亲眼看到变更落在哪本书）
    if (store.activeProjectId !== target.id) store.setActiveProject(target.id);
    const snapshotted = appendSnapshot(chapter, createSnapshot(chapter.content ?? '', 'manual'));
    useProjectStore.getState().updateActiveProject(
      { chapters: target.chapters.map((c) => (c.id === chapter.id ? { ...snapshotted, content: exec.body } : c)) },
      opts,
    );
    return { ok: true, applied: `《${target.title}》第 ${chapter.order + 1} 章正文已更新（旧正文已进快照）` };
  }

  // card-write：先走卡片命令管线，失败回落知识库追加
  const target = store.projects.find((p) => p.id === exec.bookId);
  if (!target) return { ok: false, error: '卡片提案缺少目标书籍 id（bookId），已保留待审' };
  if (store.activeProjectId !== target.id) store.setActiveProject(target.id);
  const model = usableModel();
  if (model) {
    try {
      const typePrefix = (exec.type ?? 'character').replace(/^\//, '');
      const result = await AICardCreationService.processInput(
        `/${typePrefix} ${exec.title}\n${exec.body}`,
        target,
        model,
      );
      if (result?.success && result.data) {
        const updates = applyCreatedCard(target, result.command, result.data);
        if (Object.keys(updates).length > 0) {
          useProjectStore.getState().updateActiveProject(updates, opts);
          return { ok: true, applied: result.message };
        }
      }
    } catch {
      // 解析失败走下方知识库回落，不丢字
    }
  }
  useProjectStore.getState().updateActiveProject(
    {
      knowledge: [
        ...(target.knowledge ?? []),
        {
          id: `mcp-${Date.now().toString(36)}`,
          name: exec.title,
          content: exec.body,
          type: exec.type ?? 'card',
          size: exec.body.length,
          addedAt: Date.now(),
          category: 'writing' as const,
        },
      ],
    },
    opts,
  );
  return { ok: true, applied: `已作为知识条目追加到《${target.title}》` };
}
