/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import type { ModelConfig } from '../../../../shared/types';
import type { ProviderAdapter } from './types.js';
import { geminiAdapter } from './adapters/gemini.js';
import { openAICompatibleAdapter } from './adapters/openai-compatible.js';
import { anthropicAdapter } from './adapters/anthropic.js';
import { openAIResponsesAdapter } from './adapters/openai-responses.js';

/** 根据模型配置解析出对应的 Provider 适配器 */
export function resolveAdapter(model: ModelConfig): ProviderAdapter {
  switch (model.provider) {
    case 'gemini':
      return geminiAdapter;
    case 'anthropic':
      return anthropicAdapter;
    case 'openai-responses':
      return openAIResponsesAdapter;
    case 'ollama':
    case 'openai-chat':
      return openAICompatibleAdapter;
    default:
      // 未知 provider 一律按 OpenAI 兼容协议尝试（配置端点即可工作）
      return openAICompatibleAdapter;
  }
}
