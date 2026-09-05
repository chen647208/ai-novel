/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { StorageRepository } from '../shared/services/repository';
import type { AppState, Project } from '../../shared/types';

/** 非项目配置切片键（settings + meta），用于差分持久化。 */
const NON_PROJECT_KEYS = [
  'models', 'prompts', 'cardPrompts', 'consistencyPrompts', 'consistencyCheckConfig',
  'embeddingModels', 'activeProjectId', 'activeModelId', 'activeEmbeddingModelId', 'language', 'theme',
] as const;

export type PersistOp =
  | { kind: 'saveProject'; project: Project }
  | { kind: 'deleteProject'; id: string }
  | { kind: 'saveSettings'; patch: Partial<AppState> };

/**
 * 计算两帧状态之间的持久化操作集（纯函数，便于测试）。
 *
 * 项目按 id 做引用比较：App 内所有项目更新都是不可变展开（改动的书必产生新引用，
 * 未改动的书保留原引用），因此引用不同即视为需要重写；id 消失即删除。
 * 配置切片按键做引用/值比较，仅把变化的键并入一个 saveSettings。
 */
export function computePersistDiff(prev: AppState, next: AppState): PersistOp[] {
  const ops: PersistOp[] = [];

  const prevById = new Map(prev.projects.map((p) => [p.id, p]));
  const nextIds = new Set(next.projects.map((p) => p.id));
  for (const id of prevById.keys()) {
    if (!nextIds.has(id)) ops.push({ kind: 'deleteProject', id });
  }
  for (const p of next.projects) {
    if (prevById.get(p.id) !== p) ops.push({ kind: 'saveProject', project: p });
  }

  const patch: Record<string, unknown> = {};
  let hasPatch = false;
  for (const key of NON_PROJECT_KEYS) {
    if (prev[key] !== next[key]) {
      patch[key] = next[key];
      hasPatch = true;
    }
  }
  if (hasPatch) ops.push({ kind: 'saveSettings', patch: patch as Partial<AppState> });

  return ops;
}

/** 执行差分：把变化增量落到 repository（SQLite 走按行写，JSON 后端内部串行化）。 */
export async function persistDiff(repo: StorageRepository, prev: AppState, next: AppState): Promise<void> {
  const ops = computePersistDiff(prev, next);
  await Promise.all(ops.map((op) => {
    switch (op.kind) {
      case 'saveProject': return repo.saveProject(op.project);
      case 'deleteProject': return repo.deleteProject(op.id);
      case 'saveSettings': return repo.saveSettings(op.patch);
    }
  }));
}
