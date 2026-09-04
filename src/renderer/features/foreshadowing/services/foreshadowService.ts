/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 伏笔追踪服务。
 * 纯函数负责数据管理与提示词注入；AI 辅助检测复用新 AI 层的 callJSON。
 */
import type { Foreshadow, ForeshadowImportance, ForeshadowStatus, ModelConfig, Project } from '../../../../shared/types';
import { AIService } from '../../../features/assistant/services/aiService';

const IMPORTANCE_RANK: Record<ForeshadowImportance, number> = { critical: 0, major: 1, minor: 2 };

export function createForeshadow(
  data: Pick<Foreshadow, 'title' | 'detail'> & Partial<Foreshadow>,
  now: number = Date.now(),
): Foreshadow {
  return {
    id: `fs_${now}_${Math.random().toString(36).slice(2, 9)}`,
    title: data.title.trim(),
    detail: data.detail.trim(),
    status: data.status ?? 'planted',
    importance: data.importance ?? 'major',
    plantedChapterId: data.plantedChapterId,
    plantedChapterOrder: data.plantedChapterOrder,
    payoffChapterId: data.payoffChapterId,
    payoffChapterOrder: data.payoffChapterOrder,
    tags: data.tags ?? [],
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };
}

export function addForeshadow(project: Project, foreshadow: Foreshadow): Project {
  return { ...project, foreshadows: [...(project.foreshadows ?? []), foreshadow] };
}

export function updateForeshadow(project: Project, id: string, patch: Partial<Foreshadow>, now: number = Date.now()): Project {
  return {
    ...project,
    foreshadows: (project.foreshadows ?? []).map((f) => (f.id === id ? { ...f, ...patch, updatedAt: now } : f)),
  };
}

export function removeForeshadow(project: Project, id: string): Project {
  return { ...project, foreshadows: (project.foreshadows ?? []).filter((f) => f.id !== id) };
}

/** 标记回收：写入回收章节信息并置状态 */
export function payOffForeshadow(
  project: Project,
  id: string,
  chapter: { id: string; order: number },
  now: number = Date.now(),
): Project {
  return updateForeshadow(
    project,
    id,
    { status: 'paid-off', payoffChapterId: chapter.id, payoffChapterOrder: chapter.order },
    now,
  );
}

export function setStatus(project: Project, id: string, status: ForeshadowStatus, now: number = Date.now()): Project {
  return updateForeshadow(project, id, { status }, now);
}

/** 未回收伏笔（planted），按重要度、埋设顺序排序 */
export function openForeshadows(project: Project): Foreshadow[] {
  return (project.foreshadows ?? [])
    .filter((f) => f.status === 'planted')
    .sort((a, b) => {
      const byImportance = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
      if (byImportance !== 0) return byImportance;
      return (a.plantedChapterOrder ?? 0) - (b.plantedChapterOrder ?? 0);
    });
}

/**
 * 超期未回收伏笔：埋设后经过的章节数超过阈值仍为 planted。
 * @param currentOrder 当前写作进度（章节 order）
 * @param threshold 允许悬空的章节跨度，默认 10
 */
export function overdueForeshadows(project: Project, currentOrder: number, threshold = 10): Foreshadow[] {
  return openForeshadows(project).filter((f) => {
    if (f.plantedChapterOrder === undefined) return false;
    return currentOrder - f.plantedChapterOrder >= threshold;
  });
}

export interface ForeshadowCounts {
  total: number;
  planted: number;
  paidOff: number;
  abandoned: number;
}

export function foreshadowCounts(project: Project): ForeshadowCounts {
  const list = project.foreshadows ?? [];
  return {
    total: list.length,
    planted: list.filter((f) => f.status === 'planted').length,
    paidOff: list.filter((f) => f.status === 'paid-off').length,
    abandoned: list.filter((f) => f.status === 'abandoned').length,
  };
}

/**
 * 构建注入生成提示词的伏笔上下文（RAG 式增强）。
 * 列出截至某章节仍未回收的伏笔，提醒模型承接或适时回收。
 */
export function buildForeshadowContextForPrompt(project: Project, upToOrder: number): string {
  const relevant = openForeshadows(project).filter(
    (f) => f.plantedChapterOrder === undefined || f.plantedChapterOrder <= upToOrder,
  );
  if (relevant.length === 0) return '';

  const lines = relevant.map((f) => {
    const planted = f.plantedChapterOrder !== undefined ? `第${f.plantedChapterOrder + 1}章埋设` : '埋设章节未定';
    return `- [${importanceLabel(f.importance)}] ${f.title}（${planted}）：${f.detail}`;
  });
  return `\n\n### 待回收伏笔 (Open Foreshadows)\n以下伏笔尚未回收，请在合适处自然承接或推进，切勿遗忘或生硬点破：\n${lines.join('\n')}`;
}

function importanceLabel(imp: ForeshadowImportance): string {
  return imp === 'critical' ? '关键' : imp === 'major' ? '重要' : '次要';
}

/** AI 检测：给定章节正文，判断其中回收了哪些未回收伏笔，返回伏笔 id 列表 */
export async function detectPaidOffForeshadows(
  model: ModelConfig,
  project: Project,
  chapter: { id: string; title: string; order: number; content: string },
): Promise<{ ids: string[]; error?: string }> {
  const open = openForeshadows(project);
  if (open.length === 0 || !chapter.content.trim()) {
    return { ids: [] };
  }

  const list = open.map((f) => ({ id: f.id, title: f.title, detail: f.detail }));
  const prompt = `你是一名小说编辑。下面是本书尚未回收的伏笔清单，以及最新一章的正文。请判断该章正文实际回收（呼应/揭示/兑现）了其中哪些伏笔。

### 伏笔清单（JSON）
${JSON.stringify(list, null, 0)}

### 第 ${chapter.order + 1} 章《${chapter.title}》正文
"""
${chapter.content.slice(0, 8000)}
"""

请仅输出 JSON：{"paidOffIds": ["被回收的伏笔id", ...]}。若没有回收任何伏笔，输出 {"paidOffIds": []}。不要输出解释。`;

  const result = await AIService.callJSON<{ paidOffIds?: unknown }>(model, prompt, {
    validate: (v): v is { paidOffIds: string[] } =>
      !!v && typeof v === 'object' && Array.isArray((v as { paidOffIds?: unknown }).paidOffIds),
  });

  if (result.error) return { ids: [], error: result.error };

  const validIds = new Set(open.map((f) => f.id));
  const ids = ((result.data as { paidOffIds: unknown[] }).paidOffIds ?? [])
    .filter((x): x is string => typeof x === 'string' && validIds.has(x));
  return { ids };
}
