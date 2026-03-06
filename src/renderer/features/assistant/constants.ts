import type { OutputMode } from '../../../shared/types';
import type {
  AssistantCategory,
  AssistantEditCategory,
  AssistantWindowPosition,
  AssistantWindowSize,
  SyncStatus,
} from './types';

export const DEFAULT_ASSISTANT_OUTPUT_MODE: OutputMode = 'streaming';
export const DEFAULT_ASSISTANT_CATEGORY: AssistantCategory = 'inspiration';
export const DEFAULT_ASSISTANT_EDIT_CATEGORY: AssistantEditCategory = 'inspiration';
export const DEFAULT_ASSISTANT_SYNC_STATUS: SyncStatus = 'idle';
export const DEFAULT_ASSISTANT_SUB_SELECTION_ID = 'all';
export const DEFAULT_ASSISTANT_DRAG_OFFSET: AssistantWindowPosition = { x: 0, y: 0 };
export const DEFAULT_ASSISTANT_SIZE: AssistantWindowSize = { width: 380, height: 600 };

export const getDefaultAssistantPosition = (): AssistantWindowPosition => ({
  x: window.innerWidth - 420,
  y: window.innerHeight - 650,
});
