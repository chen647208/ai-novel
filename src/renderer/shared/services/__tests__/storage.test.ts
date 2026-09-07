/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { AppState } from '../../../../shared/types';

/**
 * 存储层 IPC 契约 + 往返测试。
 * 用内存版 electronAPI 模拟主进程文件系统，验证：
 * 1. saveState/loadStateAsync 通过 getAppDataPath/exists/readFile/writeFile 正确往返
 * 2. 新增字段（foreshadows、chapter.snapshots）经迁移后完整保留
 */

function makeInMemoryElectron() {
  const files = new Map<string, string>();
  const appDataPath = '/appdata';
  return {
    files,
    api: {
      getAppDataPath: async () => appDataPath,
      exists: async (p: string) => files.has(p),
      readFile: async (p: string) => {
        const v = files.get(p);
        if (v === undefined) throw new Error('ENOENT ' + p);
        return v;
      },
      writeFile: async (p: string, data: string) => {
        files.set(p, data);
        return true;
      },
      unlink: async (p: string) => {
        files.delete(p);
        return true;
      },
    },
  };
}

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

const sampleState = (): AppState =>
  ({
    projects: [
      {
        id: 'p1',
        title: '测试书',
        inspiration: '',
        intro: '',
        characters: [],
        outline: '',
        virtualChapters: [],
        knowledge: [],
        lastModified: 1,
        foreshadows: [
          {
            id: 'fs1',
            title: '神秘胎记',
            detail: '主角身世',
            status: 'planted',
            importance: 'critical',
            tags: [],
            plantedChapterOrder: 0,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        chapters: [
          {
            id: 'c1',
            title: '第一章',
            summary: '',
            content: '正文内容',
            order: 0,
            snapshots: [
              { id: 'snap1', content: '早期草稿', timestamp: 1, charCount: 4, source: 'auto' },
            ],
          },
        ],
      },
    ],
    activeProjectId: 'p1',
    models: [],
    prompts: [],
    activeModelId: null,
    embeddingModels: [],
    activeEmbeddingModelId: null,
  } as unknown as AppState);

describe('storage 往返（Electron 模式）', () => {
  let electron: ReturnType<typeof makeInMemoryElectron>;

  beforeEach(async () => {
    electron = makeInMemoryElectron();
    (globalThis as any).window = { electronAPI: electron.api };
    (globalThis as any).localStorage = makeLocalStorage();
  });

  it('saveState 写入 userData 下的状态文件', async () => {
    const { storage } = await import('../storage');
    await storage.saveState(sampleState());
    expect(electron.files.has('/appdata/novalist-data.json')).toBe(true);
  });

  it('loadStateAsync 读回并保留 foreshadows 与章节 snapshots', async () => {
    const { storage } = await import('../storage');
    await storage.saveState(sampleState());
    const loaded = await storage.loadStateAsync();
    expect(loaded).not.toBeNull();
    const project = loaded!.projects[0]!;
    expect(project.foreshadows).toHaveLength(1);
    expect(project.foreshadows![0]!.title).toBe('神秘胎记');
    expect(project.chapters[0]!.snapshots).toHaveLength(1);
    expect(project.chapters[0]!.snapshots![0]!.content).toBe('早期草稿');
  });

  it('clearState 删除状态文件', async () => {
    const { storage } = await import('../storage');
    await storage.saveState(sampleState());
    await storage.clearState();
    expect(electron.files.has('/appdata/novalist-data.json')).toBe(false);
  });
});
