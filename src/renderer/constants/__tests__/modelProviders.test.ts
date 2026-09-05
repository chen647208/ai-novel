/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { modelProviders, findProviderPreset } from '../modelProviders';
import type { ModelProvider } from '../../../shared/types';

const VALID_PROTOCOLS: ModelProvider[] = ['openai-chat', 'openai-responses', 'anthropic', 'gemini', 'ollama'];

describe('modelProviders 渠道预设注册表', () => {
  it('id 唯一且协议合法', () => {
    const ids = new Set<string>();
    for (const p of modelProviders) {
      expect(p.id.length).toBeGreaterThan(0);
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(VALID_PROTOCOLS).toContain(p.protocol);
    }
  });

  it('官方渠道预置端点（gemini 除外，走官方默认）与推荐模型', () => {
    const officials = modelProviders.filter((p) => p.official);
    expect(officials.length).toBeGreaterThanOrEqual(10);
    for (const p of officials) {
      if (p.protocol !== 'gemini') {
        expect(p.endpoint.length).toBeGreaterThan(0);
      }
      expect(p.recommendedModels.length).toBeGreaterThan(0);
    }
  });

  it('自定义渠道端点与推荐模型留空，交由用户填写', () => {
    const customs = modelProviders.filter((p) => !p.official);
    expect(customs.length).toBeGreaterThan(0);
    for (const p of customs) {
      expect(p.endpoint).toBe('');
      expect(p.recommendedModels).toEqual([]);
    }
  });

  it('覆盖四种通用协议', () => {
    const protocols = new Set(modelProviders.map((p) => p.protocol));
    for (const proto of ['openai-chat', 'openai-responses', 'anthropic', 'gemini'] as ModelProvider[]) {
      expect(protocols.has(proto)).toBe(true);
    }
  });

  it('内置五家国内官方渠道', () => {
    const presetIds = new Set(modelProviders.map((p) => p.id));
    for (const id of ['deepseek', 'kimi', 'zhipu', 'qwen', 'minimax']) {
      expect(presetIds.has(id)).toBe(true);
    }
  });

  it('官方渠道的推荐模型首项非空，供快速添加直接取用', () => {
    for (const p of modelProviders.filter((x) => x.official)) {
      expect(typeof p.recommendedModels[0]).toBe('string');
      expect(p.recommendedModels[0]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('findProviderPreset 命中与未命中', () => {
    expect(findProviderPreset('deepseek')?.protocol).toBe('openai-chat');
    expect(findProviderPreset('minimax')?.protocol).toBe('anthropic');
    expect(findProviderPreset('nope')).toBeUndefined();
    expect(findProviderPreset(undefined)).toBeUndefined();
  });
});
