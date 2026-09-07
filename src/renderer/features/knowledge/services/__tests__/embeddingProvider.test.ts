/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 三个被封装依赖的替身：以对象引用形式暴露，便于逐用例改其行为。
// 用 vi.hoisted 创建，确保被提升的 vi.mock 工厂可安全引用。
const { apiImpl, simpleImpl, modelImpl } = vi.hoisted(() => ({
  apiImpl: {
    initialize: vi.fn(),
    reloadConfig: vi.fn(),
    getDimensions: vi.fn(() => 1536),
    getStatus: vi.fn(() => ({ isReady: true, modelName: 'api-model', dimensions: 1536, lastUsed: 0 })),
  },
  simpleImpl: {
    initialize: vi.fn(),
    getDimensions: vi.fn(() => 384),
    getVocabularySize: vi.fn(() => 1234),
    getStatus: vi.fn(() => ({ isReady: true, modelName: 'simple-tfidf', dimensions: 384, lastUsed: 0 })),
  },
  modelImpl: {
    getActiveConfig: vi.fn(),
  },
}));

vi.mock('../apiEmbeddingService', () => ({ apiEmbeddingService: apiImpl }));
vi.mock('../embeddingService', () => ({ embeddingService: simpleImpl }));
vi.mock('../../../settings/services/embeddingModelService', () => ({ embeddingModelService: modelImpl }));
vi.mock('../../../../shared/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { EmbeddingProvider } from '../embeddingProvider';

describe('EmbeddingProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    simpleImpl.getDimensions.mockReturnValue(384);
    simpleImpl.getVocabularySize.mockReturnValue(1234);
    simpleImpl.getStatus.mockReturnValue({ isReady: true, modelName: 'simple-tfidf', dimensions: 384, lastUsed: 0 });
    apiImpl.getDimensions.mockReturnValue(1536);
    apiImpl.getStatus.mockReturnValue({ isReady: true, modelName: 'api-model', dimensions: 1536, lastUsed: 0 });
  });

  it('API 初始化成功时选择 API 后端', async () => {
    apiImpl.initialize.mockResolvedValue(true);
    simpleImpl.initialize.mockResolvedValue(true);
    const p = new EmbeddingProvider();
    const ok = await p.initialize();
    expect(ok).toBe(true);
    expect(p.getMode()).toBe('api');
    expect(p.getActive()).toBe(apiImpl);
  });

  it('API 初始化失败时回退本地，仍视为可用', async () => {
    apiImpl.initialize.mockResolvedValue(false);
    simpleImpl.initialize.mockResolvedValue(true);
    const p = new EmbeddingProvider();
    const ok = await p.initialize();
    expect(ok).toBe(true);
    expect(p.getMode()).toBe('local');
    expect(p.getActive()).toBe(simpleImpl);
  });

  it('两者皆不可用时 initialize 返回 false', async () => {
    apiImpl.initialize.mockResolvedValue(false);
    simpleImpl.initialize.mockResolvedValue(false);
    const p = new EmbeddingProvider();
    expect(await p.initialize()).toBe(false);
  });

  it('get() 在 API 配置 testStatus=success 时返回 API', async () => {
    apiImpl.initialize.mockResolvedValue(true);
    simpleImpl.initialize.mockResolvedValue(true);
    modelImpl.getActiveConfig.mockResolvedValue({ testStatus: 'success' });
    const p = new EmbeddingProvider();
    await p.initialize();
    expect(await p.get()).toBe(apiImpl);
  });

  it('get() 在 API 配置失效时自动降级到本地并记住降级', async () => {
    apiImpl.initialize.mockResolvedValue(true);
    simpleImpl.initialize.mockResolvedValue(true);
    modelImpl.getActiveConfig.mockResolvedValue({ testStatus: 'failed' });
    const p = new EmbeddingProvider();
    await p.initialize();
    expect(await p.get()).toBe(simpleImpl);
    // 降级后模式切换为 local，后续 get() 不再查询配置
    expect(p.getMode()).toBe('local');
    expect(await p.get()).toBe(simpleImpl);
    expect(modelImpl.getActiveConfig).toHaveBeenCalledTimes(1);
  });

  it('get() 在配置为 null 时降级到本地', async () => {
    apiImpl.initialize.mockResolvedValue(true);
    simpleImpl.initialize.mockResolvedValue(true);
    modelImpl.getActiveConfig.mockResolvedValue(null);
    const p = new EmbeddingProvider();
    await p.initialize();
    expect(await p.get()).toBe(simpleImpl);
  });

  it('refresh() 重新加载配置并按结果重选后端', async () => {
    apiImpl.initialize.mockResolvedValue(true);
    simpleImpl.initialize.mockResolvedValue(true);
    const p = new EmbeddingProvider();
    await p.initialize();
    expect(p.getMode()).toBe('api');

    // 模拟设置变更后 API 不再可用
    apiImpl.initialize.mockResolvedValue(false);
    await p.refresh();
    expect(apiImpl.reloadConfig).toHaveBeenCalledTimes(1);
    expect(p.getMode()).toBe('local');
    expect(p.getActive()).toBe(simpleImpl);
  });

  it('getVocabularySize 始终读取本地词表', async () => {
    apiImpl.initialize.mockResolvedValue(true);
    simpleImpl.initialize.mockResolvedValue(true);
    const p = new EmbeddingProvider();
    await p.initialize();
    expect(p.getVocabularySize()).toBe(1234);
  });
});
