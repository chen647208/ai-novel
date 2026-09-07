/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { EmbeddingModelConfig } from '../../../../shared/types';

/**
 * embeddingConfigStore 往返测试。
 * 该模块从 storage 上帝对象解耦而来，唯一消费者是 embeddingModelService。
 * 用内存版 electronAPI 模拟文件系统，验证 CRUD 与激活互斥语义。
 */

function makeInMemoryElectron() {
  const files = new Map<string, string>();
  return {
    files,
    api: {
      getAppDataPath: async () => '/appdata',
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
    },
  };
}

const cfg = (id: string, over: Partial<EmbeddingModelConfig> = {}): EmbeddingModelConfig =>
  ({ id, name: `模型-${id}`, isActive: false, ...over } as unknown as EmbeddingModelConfig);

describe('embeddingConfigStore（Electron 模式）', () => {
  let electron: ReturnType<typeof makeInMemoryElectron>;

  beforeEach(async () => {
    electron = makeInMemoryElectron();
    (globalThis as any).window = { electronAPI: electron.api };
    (globalThis as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  });

  it('空存储返回默认空数组', async () => {
    const { embeddingConfigStore } = await import('../embeddingConfigStore');
    expect(await embeddingConfigStore.getAll()).toEqual([]);
  });

  it('save 追加与按 id 更新', async () => {
    const { embeddingConfigStore } = await import('../embeddingConfigStore');
    await embeddingConfigStore.save(cfg('a'));
    await embeddingConfigStore.save(cfg('b'));
    expect((await embeddingConfigStore.getAll()).map(c => c.id)).toEqual(['a', 'b']);

    await embeddingConfigStore.save(cfg('a', { name: '改名' }));
    const all = await embeddingConfigStore.getAll();
    expect(all).toHaveLength(2);
    expect(all.find(c => c.id === 'a')!.name).toBe('改名');
  });

  it('remove 删除指定配置', async () => {
    const { embeddingConfigStore } = await import('../embeddingConfigStore');
    await embeddingConfigStore.save(cfg('a'));
    await embeddingConfigStore.save(cfg('b'));
    await embeddingConfigStore.remove('a');
    expect((await embeddingConfigStore.getAll()).map(c => c.id)).toEqual(['b']);
  });

  it('setActive 互斥：仅目标激活', async () => {
    const { embeddingConfigStore } = await import('../embeddingConfigStore');
    await embeddingConfigStore.save(cfg('a'));
    await embeddingConfigStore.save(cfg('b'));
    await embeddingConfigStore.setActive('b');
    const active = await embeddingConfigStore.getActive();
    expect(active?.id).toBe('b');
    const all = await embeddingConfigStore.getAll();
    expect(all.filter(c => c.isActive).map(c => c.id)).toEqual(['b']);
  });

  it('getById 命中与未命中', async () => {
    const { embeddingConfigStore } = await import('../embeddingConfigStore');
    await embeddingConfigStore.save(cfg('a'));
    expect((await embeddingConfigStore.getById('a'))?.id).toBe('a');
    expect(await embeddingConfigStore.getById('ghost')).toBeNull();
  });

  it('持久化落在 embedding-config.json', async () => {
    const { embeddingConfigStore } = await import('../embeddingConfigStore');
    await embeddingConfigStore.save(cfg('a'));
    expect(electron.files.has('/appdata/embedding-config.json')).toBe(true);
  });
});
