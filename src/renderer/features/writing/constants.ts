/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
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
