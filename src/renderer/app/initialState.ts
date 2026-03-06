import { AppState } from '../../shared/types';
import { DEFAULT_PROMPTS, INITIAL_MODELS } from '../../shared/constants';
import { getDefaultConsistencyPrompts } from '../constants/consistencyCheck';

export const INITIAL_APP_STATE: AppState = {
  projects: [],
  activeProjectId: null,
  models: INITIAL_MODELS,
  prompts: DEFAULT_PROMPTS,
  activeModelId: 'default-gemini',
  embeddingModels: [],
  activeEmbeddingModelId: null,
  cardPrompts: [],
  consistencyPrompts: getDefaultConsistencyPrompts(),
  consistencyCheckConfig: {
    mode: 'rule',
    weights: {
      rule: 0.4,
      ai: 0.3,
      vector: 0.3,
    },
    selectedPromptTemplates: {},
  },
};

export type ResetModalState = {
  isOpen: boolean;
  type: 'clear_projects' | 'factory_reset' | null;
};




