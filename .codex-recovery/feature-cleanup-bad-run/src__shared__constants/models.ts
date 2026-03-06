import type { ModelConfig } from '../types';

export const INITIAL_MODELS: ModelConfig[] = [
  {
    id: 'default-gemini',
    name: 'Gemini (Default)',
    provider: 'gemini',
    modelName: 'gemini-3-flash-preview',
    supportsStreaming: true,
  },
];
