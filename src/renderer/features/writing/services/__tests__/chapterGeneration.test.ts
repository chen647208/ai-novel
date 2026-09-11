/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCall, mockCallStreaming, mockBuildHistory } = vi.hoisted(() => ({
  mockCall: vi.fn(),
  mockCallStreaming: vi.fn(),
  mockBuildHistory: vi.fn(() => ({ id: 'h1' })),
}));

vi.mock('@/shared/services/ai/aiService', () => ({
  AIService: {
    call: mockCall,
    callStreaming: mockCallStreaming,
    buildHistoryRecordData: mockBuildHistory,
  },
}));

import { applyGeneratedContent, applyBatchResults, generateChapterContent, type GenerationIo } from '../chapterGeneration';
import type { Chapter, ModelConfig } from '@shared/types';

function io(): GenerationIo {
  return {
    setActiveChapterId: vi.fn(),
    setIsStreaming: vi.fn(),
    setStreamingContent: vi.fn(),
    setStreamingResponse: vi.fn(),
    setStreamingAbortController: vi.fn(),
    setStreamingTokens: vi.fn(),
    setTraditionalTokens: vi.fn(),
  };
}

const model = { id: 'm', name: 'M', provider: 'openai-chat', modelName: 'x', isEnabled: true } as unknown as ModelConfig;
const template = { id: 't', name: '模板' };

describe('applyGeneratedContent', () => {
  it('短正文直替，长正文追加', () => {
    expect(applyGeneratedContent('', '新')).toBe('新');
    expect(applyGeneratedContent('短', '新')).toBe('新');
    expect(applyGeneratedContent('x'.repeat(60), '新')).toBe(`${'x'.repeat(60)}\n\n新`);
  });

  it('有选区时走替换函数', () => {
    const replace = vi.fn(() => '替换后');
    expect(applyGeneratedContent('原文', '新', { start: 0, end: 2 }, replace)).toBe('替换后');
    expect(replace).toHaveBeenCalledWith('原文', 0, 2, '新');
  });
});

describe('applyBatchResults', () => {
  it('命中章节替换正文并追加历史，未命中不动', () => {
    const chapters = [
      { id: 'a', content: '旧', history: [] },
      { id: 'b', content: '保持', history: [] },
    ] as unknown as Chapter[];
    const out = applyBatchResults(chapters, [{ id: 'a', content: '新', historyRecord: { id: 'h' } as never }]);
    expect(out[0]!.content).toBe('新');
    expect(out[0]!.history).toHaveLength(1);
    expect(out[1]!.content).toBe('保持');
  });
});

describe('generateChapterContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildHistory.mockImplementation(() => ({ id: 'h1' }));
  });

  it('传统模式：调用 call，回传 tokens，返回合并内容与历史', async () => {
    mockCall.mockResolvedValue({ content: '生成结果', tokens: { prompt: 1, completion: 2, total: 3 } });
    const callbacks = io();
    const chapter = { id: 'c', title: '一', content: '' } as unknown as Chapter;
    const result = await generateChapterContent({ chapter, template, model, prompt: 'P', outputMode: 'traditional', io: callbacks });
    expect(mockCall).toHaveBeenCalledWith(model, 'P', { signal: undefined });
    expect(callbacks.setTraditionalTokens).toHaveBeenCalledWith({ prompt: 1, completion: 2, total: 3 });
    expect(result.content).toBe('生成结果');
    expect(result.historyRecord).toEqual({ id: 'h1' });
  });

  it('流式模式：callStreaming 完成时回传累计内容并结束流状态', async () => {
    mockCallStreaming.mockImplementation((_m, _p, onChunk: (r: unknown) => void) => {
      onChunk({ content: '流', tokens: { prompt: 1, completion: 1, total: 2 }, isComplete: false });
      onChunk({ content: '流式内容', isComplete: true });
      return Promise.resolve();
    });
    const callbacks = io();
    const chapter = { id: 'c', title: '一', content: '' } as unknown as Chapter;
    const result = await generateChapterContent({ chapter, template, model, prompt: 'P', outputMode: 'streaming', io: callbacks });
    expect(callbacks.setIsStreaming).toHaveBeenCalledWith(true);
    expect(callbacks.setIsStreaming).toHaveBeenCalledWith(false);
    expect(result.content).toBe('流式内容');
  });

  it('流式错误：reject 并抛错', async () => {
    mockCallStreaming.mockImplementation((_m, _p, onChunk: (r: unknown) => void) => {
      onChunk({ content: '', isComplete: true, error: '失败' });
      return Promise.resolve();
    });
    const chapter = { id: 'c', title: '一', content: '' } as unknown as Chapter;
    await expect(generateChapterContent({ chapter, template, model, prompt: 'P', outputMode: 'streaming', io: io() })).rejects.toThrow('失败');
  });
});
