/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ModelConfig, AIResponse } from '../../../../../shared/types';

const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    supportsStreaming: vi.fn(() => true),
    complete: vi.fn(),
    stream: vi.fn(),
  },
}));

vi.mock('@/shared/services/ai/resolve.js', () => ({ resolveAdapter: () => mockAdapter }));

import { AIService } from '../aiService';

const model: ModelConfig = {
  id: 'm1',
  name: 'Test Model',
  provider: 'openai-chat',
  endpoint: 'https://example.com/v1',
  modelName: 'test-model',
  temperature: 1,
  maxTokens: 1024,
  supportsStreaming: true,
};

const okResponse = (content: string, extra: Partial<AIResponse> = {}): AIResponse => ({
  content,
  model: 'test-model',
  tokens: { prompt: 1, completion: 2, total: 3 },
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockAdapter.supportsStreaming.mockReturnValue(true);
});

describe('buildHistoryRecordData', () => {
  it('映射模型/响应/元数据字段并生成唯一 id', () => {
    const record = AIService.buildHistoryRecordData('ch1', 'prompt', 'content', model, okResponse('x'), {
      templateName: 'T',
      batchGeneration: true,
      chapterTitle: '第一章',
      operationType: 'polish',
    });
    expect(record.chapterId).toBe('ch1');
    expect(record.prompt).toBe('prompt');
    expect(record.generatedContent).toBe('content');
    expect(record.modelConfig).toEqual({ modelName: 'test-model', provider: 'openai-chat', temperature: 1, maxTokens: 1024 });
    expect(record.tokens).toEqual({ prompt: 1, completion: 2, total: 3 });
    expect(record.metadata?.templateName).toBe('T');
    expect(record.metadata?.operationType).toBe('polish');
    expect(record.id.startsWith('history_')).toBe(true);
  });

  it('无元数据时 metadata 为 undefined', () => {
    const record = AIService.buildHistoryRecordData('ch1', 'p', 'c', model, okResponse('x'));
    expect(record.metadata).toBeUndefined();
  });
});

describe('call', () => {
  it('无模型时返回错误且不抛异常', async () => {
    const res = await AIService.call(null as unknown as ModelConfig, 'p');
    expect(res.content).toBe('');
    expect(res.error).toBeTruthy();
    expect(mockAdapter.complete).not.toHaveBeenCalled();
  });

  it('委托给适配器 complete', async () => {
    mockAdapter.complete.mockResolvedValue(okResponse('hello'));
    const res = await AIService.call(model, 'p');
    expect(res.content).toBe('hello');
    expect(mockAdapter.complete).toHaveBeenCalledWith(model, 'p', undefined);
  });
});

describe('callJSON', () => {
  it('无模型时返回错误', async () => {
    const res = await AIService.callJSON(null as unknown as ModelConfig, 'p');
    expect(res.raw).toBe('');
    expect(res.error).toBeTruthy();
  });

  it('合法 JSON 一次成功', async () => {
    mockAdapter.complete.mockResolvedValue(okResponse('{"a":1}'));
    const res = await AIService.callJSON<{ a: number }>(model, 'p');
    expect(res.data).toEqual({ a: 1 });
    expect(res.error).toBeUndefined();
  });
});

describe('testConnection', () => {
  it('错误响应返回 [ERROR] 前缀', async () => {
    mockAdapter.complete.mockResolvedValue({ content: '', error: 'boom' } as AIResponse);
    const log = await AIService.testConnection(model);
    expect(log.startsWith('[ERROR]')).toBe(true);
    expect(log).toContain('boom');
  });

  it('包含连接成功/success 返回 [SUCCESS]', async () => {
    mockAdapter.complete.mockResolvedValue(okResponse('连接成功'));
    expect((await AIService.testConnection(model)).startsWith('[SUCCESS]')).toBe(true);
    mockAdapter.complete.mockResolvedValue(okResponse('OK, success!'));
    expect((await AIService.testConnection(model)).startsWith('[SUCCESS]')).toBe(true);
  });

  it('其他内容返回 [INFO]', async () => {
    mockAdapter.complete.mockResolvedValue(okResponse('你好'));
    expect((await AIService.testConnection(model)).startsWith('[INFO]')).toBe(true);
  });
});

describe('callStreaming', () => {
  it('无模型时回调错误并结束', async () => {
    const onChunk = vi.fn();
    await AIService.callStreaming(null as unknown as ModelConfig, 'p', onChunk);
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk.mock.calls[0]![0]!.isComplete).toBe(true);
    expect(onChunk.mock.calls[0]![0]!.error).toBeTruthy();
  });

  it('支持流式时委托适配器 stream', async () => {
    mockAdapter.stream.mockResolvedValue(undefined);
    const onChunk = vi.fn();
    await AIService.callStreaming(model, 'p', onChunk);
    expect(mockAdapter.stream).toHaveBeenCalledWith(model, 'p', onChunk, undefined);
  });

  it('模型关闭流式时降级为 complete 并带 notice', async () => {
    mockAdapter.complete.mockResolvedValue(okResponse('done'));
    const onChunk = vi.fn();
    await AIService.callStreaming({ ...model, supportsStreaming: false }, 'p', onChunk);
    expect(mockAdapter.stream).not.toHaveBeenCalled();
    expect(onChunk).toHaveBeenCalledTimes(1);
    const chunk = onChunk.mock.calls[0]![0]!;
    expect(chunk.isComplete).toBe(true);
    expect(chunk.isStreaming).toBe(false);
    expect(chunk.notice).toBeTruthy();
    expect(chunk.error).toBeUndefined();
  });

  it('适配器不支持流式时同样降级', async () => {
    mockAdapter.supportsStreaming.mockReturnValue(false);
    mockAdapter.complete.mockResolvedValue(okResponse('d'));
    const onChunk = vi.fn();
    await AIService.callStreaming(model, 'p', onChunk);
    expect(mockAdapter.stream).not.toHaveBeenCalled();
    expect(onChunk.mock.calls[0]![0]!.isStreaming).toBe(false);
  });
});
