/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { afterEach,describe, expect, it, vi } from 'vitest';

import type { ModelConfig } from '../../../../../shared/types';
import { ModelListService } from '../modelListService';

const model = (over: Partial<ModelConfig>): ModelConfig =>
  ({ id: 'm', name: 'M', provider: 'openai-chat', endpoint: 'https://api.x/v1', apiKey: 'sk-x', modelName: 'x', ...over });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ModelListService.fetchModels', () => {
  it('成功获取非空列表：覆盖 availableModels 并写入缓存时间', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'a' }, { id: 'b' }] })));
    const m = model({ availableModels: ['builtin-1'] });
    const result = await ModelListService.fetchModels(m);
    expect(result).toEqual(['a', 'b']);
    expect(m.availableModels).toEqual(['a', 'b']);
    expect(m.modelsLastFetched).toBeTypeOf('number');
    expect(m.modelsFetchError).toBeUndefined();
  });

  it('实时返回空列表：保留内置推荐兜底，不覆盖、不写缓存时间', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [] })));
    const m = model({ availableModels: ['deepseek-v4-pro', 'deepseek-v4-flash'] });
    const result = await ModelListService.fetchModels(m);
    expect(result).toEqual(['deepseek-v4-pro', 'deepseek-v4-flash']);
    expect(m.availableModels).toEqual(['deepseek-v4-pro', 'deepseek-v4-flash']);
    expect(m.modelsLastFetched).toBeUndefined();
  });

  it('请求失败：抛出错误且保留内置列表（供上层静默兜底）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));
    const m = model({ availableModels: ['builtin-keep'] });
    await expect(ModelListService.fetchModels(m)).rejects.toThrow();
    expect(m.availableModels).toEqual(['builtin-keep']);
    expect(m.modelsFetchError).toBeTruthy();
  });

  it('缓存有效（1 小时内且已有列表）：直接返回缓存，不发请求', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const m = model({ availableModels: ['cached'], modelsLastFetched: Date.now() });
    const result = await ModelListService.fetchModels(m);
    expect(result).toEqual(['cached']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ModelListService 各协议列表端点', () => {
  it('Gemini 官方（端点留空）走原生 generativelanguage 列表并剥离 models/ 前缀', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ models: [{ name: 'models/gemini-3.7-flash' }, { name: 'models/gemini-3.5-flash' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await ModelListService.fetchModels(model({ provider: 'gemini', endpoint: '', apiKey: 'AIza-xyz' }));
    expect(fetchMock.mock.calls[0]![0]).toContain('generativelanguage.googleapis.com/v1beta/models?key=AIza-xyz');
    expect(result).toEqual(['gemini-3.7-flash', 'gemini-3.5-flash']);
  });

  it('Anthropic 用 x-api-key 头并规范化 /v1/models', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'claude-sonnet-5' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await ModelListService.fetchModels(model({ provider: 'anthropic', endpoint: 'https://api.anthropic.com', apiKey: 'sk-ant' }));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/models');
    expect(init.headers).toMatchObject({ 'x-api-key': 'sk-ant' });
    expect(result).toEqual(['claude-sonnet-5']);
  });

  it('Anthropic 兼容网关（已含 /v1）只补 /models', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'MiniMax-M3' }] }));
    vi.stubGlobal('fetch', fetchMock);
    await ModelListService.fetchModels(model({ provider: 'anthropic', endpoint: 'https://api.minimaxi.com/anthropic/v1', apiKey: 'k' }));
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.minimaxi.com/anthropic/v1/models');
  });
});
