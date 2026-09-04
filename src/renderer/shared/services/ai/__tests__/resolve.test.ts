/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { describe, it, expect } from 'vitest';
import type { ModelConfig, ModelProvider } from '../../../../../shared/types';
import { resolveAdapter } from '../resolve';
import { geminiAdapter } from '../adapters/gemini';
import { openAICompatibleAdapter } from '../adapters/openai-compatible';
import { anthropicAdapter } from '../adapters/anthropic';
import { openAIResponsesAdapter } from '../adapters/openai-responses';

const model = (provider: ModelProvider): ModelConfig =>
  ({ id: 'm', name: 'M', provider, modelName: 'x' } as ModelConfig);

describe('resolveAdapter 协议映射', () => {
  it('gemini 走原生适配器', () => {
    expect(resolveAdapter(model('gemini'))).toBe(geminiAdapter);
  });

  it('openai-chat 与 ollama 走 Chat Completions 适配器', () => {
    expect(resolveAdapter(model('openai-chat'))).toBe(openAICompatibleAdapter);
    expect(resolveAdapter(model('ollama'))).toBe(openAICompatibleAdapter);
  });

  it('anthropic 走 Messages 适配器', () => {
    expect(resolveAdapter(model('anthropic'))).toBe(anthropicAdapter);
  });

  it('openai-responses 走 Responses 适配器', () => {
    expect(resolveAdapter(model('openai-responses'))).toBe(openAIResponsesAdapter);
  });
});
