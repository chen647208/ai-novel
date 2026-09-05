/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { OutputMode } from '../../../shared/types';
import type { BatchMode, BatchProgress, GenerationModalState, TokenUsage } from './types';

export const DEFAULT_OUTPUT_MODE: OutputMode = 'streaming';
export const DEFAULT_BATCH_MODE: BatchMode = 'single';
export const DEFAULT_TARGET_WORD_COUNT = 2000;
export const MAX_CHAPTER_CONTEXT_LENGTH = 800;
export const MAX_PREVIOUS_CHAPTER_SUMMARIES = 5;
export const FLOATING_MENU_WIDTH = 200;
export const FLOATING_MENU_HEIGHT = 60;
export const FLOATING_MENU_OFFSET_X = 10;
export const FLOATING_MENU_OFFSET_Y = 10;
export const FLOATING_MENU_VIEWPORT_MARGIN = 20;

// 正文生成统一输出格式约束（AI 提示词内容，按 i18n 约定保持语言无关、不翻译）。
// 模型常把 Markdown 符号或开场白混入小说正文，画布为纯文本编辑区无法渲染，故在调用前强制约束为干净散文。
export const WRITING_OUTPUT_FORMAT_DIRECTIVE =
  '\n\n### 输出格式要求\n直接输出小说正文，不要任何开场白、解释、标题或"以下是…"之类的话。使用中文标点，段落之间空一行分隔；严禁使用任何 Markdown 符号（如 # 标题、* 或 ** 加粗、- 列表、` 代码块、> 引用、--- 分隔线）。';

export const INITIAL_BATCH_PROGRESS: BatchProgress = {
  current: 0,
  total: 0,
  currentChapterTitle: '',
};

export const INITIAL_TOKEN_USAGE: TokenUsage = {
  prompt: 0,
  completion: 0,
  total: 0,
};

export const INITIAL_GENERATION_MODAL_STATE: GenerationModalState = {
  isOpen: false,
  chapter: null,
};
