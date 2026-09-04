/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import type { ProviderAdapter } from './types.js';
import { geminiAdapter } from './adapters/gemini.js';
import { openAICompatibleAdapter } from './adapters/openai-compatible.js';

export { resolveAdapter } from './resolve.js';
export * from './types.js';
export { createSSEParser } from './sse.js';
export { withRetry, isRetryableError } from './retry.js';
export { callJSON, extractJSONCandidate } from './json.js';
export { geminiAdapter, openAICompatibleAdapter };
export type { ProviderAdapter };
