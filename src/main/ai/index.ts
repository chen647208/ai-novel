/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 主进程 AI 网关层出口：适配器、协议工具与本地化。
 * 渲染进程不直接 import 本目录，一律经 preload 暴露的 aiGateway 语义化方法调用。
 */
import type { ProviderAdapter } from './types.js';
import { anthropicAdapter } from './adapters/anthropic.js';
import { geminiAdapter } from './adapters/gemini.js';
import { openAICompatibleAdapter } from './adapters/openai-compatible.js';
import { openAIResponsesAdapter } from './adapters/openai-responses.js';

export { resolveAdapter } from './resolve.js';
export * from './types.js';
export { createSSEParser } from './sse.js';
export { withRetry, isRetryableError } from './retry.js';
export { initAiI18n, aiT } from './i18n.js';
export { anthropicAdapter, geminiAdapter, openAICompatibleAdapter, openAIResponsesAdapter };
export type { ProviderAdapter };
