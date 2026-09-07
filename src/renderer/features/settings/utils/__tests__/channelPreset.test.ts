/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import type { ModelConfig } from '../../../../../shared/types';
import { channelValueFor, channelPatch, channelGroups } from '../channelPreset';
import { modelProviders, findProviderPreset } from '../../../../constants/modelProviders';

const model = (over: Partial<ModelConfig>): ModelConfig =>
  ({ id: 'm', name: 'M', provider: 'openai-chat', modelName: 'x', ...over });

describe('channelValueFor', () => {
  it('有效 presetId 直接命中', () => {
    expect(channelValueFor(model({ provider: 'openai-chat', presetId: 'deepseek' }))).toBe('deepseek');
  });

  it('未知 presetId 按协议回落', () => {
    expect(channelValueFor(model({ provider: 'anthropic', presetId: 'ghost' }))).toBe('custom-anthropic');
  });

  it('无 presetId 时按协议映射到语义渠道', () => {
    expect(channelValueFor(model({ provider: 'gemini' }))).toBe('gemini');
    expect(channelValueFor(model({ provider: 'gemini', endpoint: 'https://proxy.example.com' }))).toBe('custom-gemini');
    expect(channelValueFor(model({ provider: 'ollama' }))).toBe('ollama');
    expect(channelValueFor(model({ provider: 'anthropic' }))).toBe('custom-anthropic');
    expect(channelValueFor(model({ provider: 'openai-responses' }))).toBe('openai-responses');
    expect(channelValueFor(model({ provider: 'openai-chat' }))).toBe('custom-openai');
  });

  it('自定义 presetId 直接命中（含网关与 Gemini 自定义）', () => {
    expect(channelValueFor(model({ provider: 'openai-chat', presetId: 'gateway-openai' }))).toBe('gateway-openai');
    expect(channelValueFor(model({ provider: 'gemini', presetId: 'custom-gemini' }))).toBe('custom-gemini');
  });
});

describe('channelPatch', () => {
  it('切到官方渠道：写入协议/presetId/端点/推荐模型，模型名不在列表则重置为首个推荐', () => {
    const preset = findProviderPreset('deepseek')!;
    const patch = channelPatch(preset, model({ modelName: 'stale-model' }));
    expect(patch.provider).toBe('openai-chat');
    expect(patch.presetId).toBe('deepseek');
    expect(patch.endpoint).toBe('https://api.deepseek.com/v1');
    expect(patch.availableModels).toEqual(['deepseek-v4-pro', 'deepseek-v4-flash']);
    expect(patch.modelName).toBe('deepseek-v4-pro');
  });

  it('当前模型名已在推荐列表时保留用户选择', () => {
    const preset = findProviderPreset('deepseek')!;
    const patch = channelPatch(preset, model({ modelName: 'deepseek-v4-flash' }));
    expect(patch.modelName).toBeUndefined();
  });

  it('切到自定义渠道：保留 presetId 身份、清端点/availableModels，保留模型名', () => {
    const preset = findProviderPreset('custom-openai')!;
    const patch = channelPatch(preset, model({ modelName: 'my-model', presetId: 'deepseek' }));
    expect(patch.provider).toBe('openai-chat');
    expect(patch.presetId).toBe('custom-openai');
    expect(patch.endpoint).toBe('');
    expect(patch.availableModels).toBeUndefined();
    expect(patch.modelName).toBeUndefined();
  });

  it('不触碰 apiKey / temperature / maxTokens / systemPrompt', () => {
    const preset = findProviderPreset('anthropic')!;
    const patch = channelPatch(preset, model({}));
    expect('apiKey' in patch).toBe(false);
    expect('temperature' in patch).toBe(false);
    expect('maxTokens' in patch).toBe(false);
    expect('systemPrompt' in patch).toBe(false);
  });
});

describe('channelGroups', () => {
  const groups = channelGroups(modelProviders);
  const idsOf = (id: string) => groups.find((g) => g.id === id)?.items.map((p) => p.id) ?? [];

  it('国内官方含五家国内渠道', () => {
    for (const id of ['deepseek', 'kimi', 'zhipu', 'qwen', 'minimax']) {
      expect(idsOf('domestic')).toContain(id);
    }
  });

  it('国际官方含 OpenAI/Responses/Anthropic/Gemini，不含 Ollama', () => {
    const intl = idsOf('international');
    for (const id of ['openai', 'openai-responses', 'anthropic', 'gemini']) {
      expect(intl).toContain(id);
    }
    expect(intl).not.toContain('ollama');
  });

  it('自定义排第一组：协议先行，官方只是快捷方式', () => {
    expect(groups[0]?.id).toBe('custom');
  });

  it('本地含 Ollama，自定义含四个兼容协议渠道', () => {
    expect(idsOf('local')).toContain('ollama');
    expect(idsOf('custom')).toEqual(
      expect.arrayContaining(['custom-openai', 'gateway-openai', 'custom-anthropic', 'custom-gemini'])
    );
  });

  it('分组无重复、无遗漏（覆盖全部预设）', () => {
    const all = groups.flatMap((g) => g.items.map((p) => p.id));
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(modelProviders.map((p) => p.id).sort());
  });
});
