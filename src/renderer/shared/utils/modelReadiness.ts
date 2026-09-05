/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { ModelConfig } from '../../../shared/types';

/**
 * 判断一个模型是否“可直接用于生成”——不同提供方所需凭证不同：
 *   - gemini：走官方 API，必须有 apiKey；
 *   - ollama：本地服务，必须有 endpoint，无需 key；
 *   - openai-chat / openai-responses / anthropic：必须有 endpoint；
 *     官方渠道（presetId 存在，端点已预置）额外要求 apiKey，自定义代理可只给端点。
 *
 * 用于首启引导：默认模型对象虽存在，但未填凭证时不应放行到生成流程，
 * 而应引导用户去设置，避免直接吃到生硬的接口报错。
 */
export function isModelConfigured(model: ModelConfig | null | undefined): boolean {
  if (!model) return false;
  const hasEndpoint = Boolean(model.endpoint && model.endpoint.trim());
  const hasKey = Boolean(model.apiKey && model.apiKey.trim());
  switch (model.provider) {
    case 'gemini':
      return hasKey;
    case 'ollama':
      return hasEndpoint;
    case 'openai-chat':
    case 'openai-responses':
    case 'anthropic':
      return hasEndpoint && (model.presetId ? hasKey : true);
    default:
      return false;
  }
}
