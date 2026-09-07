/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 回收站（docs/design 扩展）：删除的书先落 trash/ 目录 JSON，30 天后自动清，
 * 期间可恢复、可彻底删除。Electron 走 userData/trash，Web 预览降级 localStorage。
 */
import type { Project } from '../../../shared/types';

export interface TrashEntry {
  id: string;
  title: string;
  deletedAt: number;
}

const TRASH_LS_KEY = 'hongyue.trash.v1';
const TRASH_RETENTION_MS = 30 * 24 * 3600 * 1000;

const fileNameOf = (id: string): string => `book-${id}.json`;

async function trashDir(): Promise<string | null> {
  const api = window.electronAPI;
  if (!api) return null;
  return `${await api.getAppDataPath()}/trash`;
}

function readLocal(): Record<string, { project: Project; deletedAt: number }> {
  try {
    return JSON.parse(localStorage.getItem(TRASH_LS_KEY) ?? '{}') as Record<string, { project: Project; deletedAt: number }>;
  } catch {
    return {};
  }
}

function writeLocal(all: Record<string, { project: Project; deletedAt: number }>): void {
  try {
    localStorage.setItem(TRASH_LS_KEY, JSON.stringify(all));
  } catch {
    // 配额不足则放弃持久化，内存态本次有效
  }
}

/** 删除的书进站（写盘失败抛错，调用方不删库）。 */
export async function moveToTrash(project: Project): Promise<void> {
  const dir = await trashDir();
  const payload = JSON.stringify({ project, deletedAt: Date.now() });
  if (dir && window.electronAPI) {
    await window.electronAPI.writeFile(`${dir}/${fileNameOf(project.id)}`, payload);
    return;
  }
  const all = readLocal();
  all[project.id] = { project, deletedAt: Date.now() };
  writeLocal(all);
}

/** 列出站内书（顺带清超期），按删除时间倒序。 */
export async function listTrash(): Promise<TrashEntry[]> {
  const dir = await trashDir();
  const now = Date.now();
  if (dir && window.electronAPI) {
    const entries = await window.electronAPI.listDirectory(dir).catch(() => []);
    const out: TrashEntry[] = [];
    for (const e of entries) {
      if (e.type !== 'file' || !e.name.endsWith('.json')) continue;
      try {
        const raw = await window.electronAPI.readFile(`${dir}/${e.name}`);
        const parsed = JSON.parse(raw) as { project: Project; deletedAt: number };
        if (now - parsed.deletedAt > TRASH_RETENTION_MS) {
          await window.electronAPI.unlink(`${dir}/${e.name}`).catch(() => {});
          continue;
        }
        out.push({ id: parsed.project.id, title: parsed.project.title, deletedAt: parsed.deletedAt });
      } catch {
        // 损坏文件跳过
      }
    }
    return out.sort((a, b) => b.deletedAt - a.deletedAt);
  }
  const all = readLocal();
  let dirty = false;
  const out: TrashEntry[] = [];
  for (const [id, v] of Object.entries(all)) {
    if (now - v.deletedAt > TRASH_RETENTION_MS) {
      delete all[id];
      dirty = true;
      continue;
    }
    out.push({ id, title: v.project.title, deletedAt: v.deletedAt });
  }
  if (dirty) writeLocal(all);
  return out.sort((a, b) => b.deletedAt - a.deletedAt);
}

/** 取出整书（调用方负责 upsert 入库）。 */
export async function readTrash(id: string): Promise<Project | null> {
  const dir = await trashDir();
  if (dir && window.electronAPI) {
    try {
      const raw = await window.electronAPI.readFile(`${dir}/${fileNameOf(id)}`);
      return (JSON.parse(raw) as { project: Project }).project;
    } catch {
      return null;
    }
  }
  return readLocal()[id]?.project ?? null;
}

/** 彻底删除（出站）。 */
export async function deleteTrash(id: string): Promise<void> {
  const dir = await trashDir();
  if (dir && window.electronAPI) {
    await window.electronAPI.unlink(`${dir}/${fileNameOf(id)}`).catch(() => {});
    return;
  }
  const all = readLocal();
  delete all[id];
  writeLocal(all);
}
