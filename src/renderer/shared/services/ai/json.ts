/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 结构化 JSON 输出：解析 + 校验 + 自动修复重试。
 * 用于卡片生成、一致性检查等要求模型返回严格 JSON 的场景。
 * 修复循环留在渲染端：validate 是函数（不可跨 IPC），补全经网关主进程执行。
 */
import { i18n } from '@/i18n';
import type { ModelConfig } from '../../../../shared/types';
import { aiGatewayClient } from './gatewayClient.js';
import type { CallOptions } from './gatewayClient.js';

/** 从模型输出中提取 JSON 候选文本：容忍围栏、前后缀说明文字 */
export function extractJSONCandidate(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fence?.[1]) text = fence[1].trim();

  // 若整体不是合法 JSON，尝试截取第一个配对的 {…} 或 […]
  if (!text.startsWith('{') && !text.startsWith('[')) {
    const firstBrace = text.search(/[{[]/);
    if (firstBrace > -1) {
      const open = text[firstBrace];
      const close = open === '{' ? '}' : ']';
      const lastClose = text.lastIndexOf(close);
      if (lastClose > firstBrace) text = text.slice(firstBrace, lastClose + 1);
    }
  }
  return text;
}

export interface JSONCallOptions<T> extends CallOptions {
  /** 结构校验：返回 false 视为解析失败并触发修复重试 */
  validate?: (value: unknown) => value is T;
  /** 解析失败后的修复重试次数，默认 1 */
  repairAttempts?: number;
}

export interface JSONCallResult<T> {
  data?: T;
  raw: string;
  error?: string;
}

/**
 * 以 JSON 模式调用模型：
 * 1. 首次调用后提取并解析 JSON
 * 2. 失败时携带错误信息要求模型修复（repairAttempts 次）
 */
export async function callJSON<T = unknown>(
  model: ModelConfig,
  prompt: string,
  options: JSONCallOptions<T> = {},
): Promise<JSONCallResult<T>> {
  const { validate, repairAttempts = 1, ...callOptions } = options;
  let currentPrompt = prompt;

  for (let attempt = 0; attempt <= repairAttempts; attempt++) {
    const response = await aiGatewayClient.complete(model, currentPrompt, callOptions);
    if (response.error) {
      return { raw: '', error: response.error };
    }

    const candidate = extractJSONCandidate(response.content);
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (!validate || validate(parsed)) {
        return { data: parsed as T, raw: response.content };
      }
      if (attempt === repairAttempts) {
        return { raw: response.content, error: i18n.t('errors:jsonValidationFailed') };
      }
      currentPrompt = `${prompt}\n\n### 修复要求\n你上一次的输出未通过结构校验。请仅输出修正后的合法 JSON，不要包含任何解释文字。`;
    } catch (e) {
      if (attempt === repairAttempts) {
        return { raw: response.content, error: i18n.t('errors:jsonParseFailed', { message: e instanceof Error ? e.message : String(e) }) };
      }
      currentPrompt = `${prompt}\n\n### 修复要求\n你上一次的输出不是合法 JSON（错误：${
        e instanceof Error ? e.message : '解析失败'
      }）。请仅输出合法的 JSON，不要包含任何解释文字或代码围栏。`;
    }
  }

  return { raw: '', error: i18n.t('errors:unknown') };
}
