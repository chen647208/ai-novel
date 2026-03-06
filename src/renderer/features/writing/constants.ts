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
