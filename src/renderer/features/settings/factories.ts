import type { CardPromptTemplate, EmbeddingModelConfig, ModelConfig, PromptTemplate } from '../../../shared/types';
import { embeddingProviders, getDefaultEmbeddingParams } from '../../constants/embeddingProviders';
import type { CardPromptImportResult, EmbeddingQuickAddTemplate } from './types';

export const createNewModelConfig = (): ModelConfig => ({
  id: Date.now().toString(),
  name: '新模型',
  provider: 'openai-compatible',
  endpoint: '',
  modelName: '',
});

export const createNewPromptTemplate = (): PromptTemplate => ({
  id: Date.now().toString(),
  category: 'edit',
  name: '新润色模板',
  content: '请润色：{content}',
});

export const createDefaultEmbeddingConfig = (): EmbeddingModelConfig => ({
  id: Date.now().toString(),
  name: '新Embedding模型',
  provider: 'siliconflow',
  endpoint: 'https://api.siliconflow.cn/v1',
  modelName: 'BAAI/bge-m3',
  dimensions: 1024,
  maxSequenceLength: 8192,
  batchSize: 16,
  timeout: 30000,
  normalizeEmbeddings: true,
  poolingStrategy: 'mean',
  truncate: 'end',
  isActive: false,
  testStatus: 'untested',
});

export const createQuickAddEmbeddingConfig = (template: EmbeddingQuickAddTemplate): EmbeddingModelConfig => {
  const provider = embeddingProviders.find((item) => item.id === template.provider);
  const defaultParams = getDefaultEmbeddingParams(template.provider);

  return {
    id: Date.now().toString(),
    name: template.name,
    provider: template.provider,
    endpoint: provider?.endpoint || '',
    modelName: template.modelName,
    apiKey: '',
    dimensions: defaultParams.dimensions,
    maxSequenceLength: defaultParams.maxSequenceLength,
    batchSize: defaultParams.batchSize,
    timeout: defaultParams.timeout,
    normalizeEmbeddings: defaultParams.normalizeEmbeddings,
    poolingStrategy: defaultParams.poolingStrategy,
    truncate: defaultParams.truncate,
    isActive: false,
    testStatus: 'untested',
  };
};

export const createNewCardPromptTemplate = (): CardPromptTemplate => ({
  id: Date.now().toString(),
  category: 'card-character',
  name: '新角色模板',
  content: '请根据描述创建角色：\n\n{description}\n\n项目背景：\n{context}',
  variables: ['description', 'context'],
  isDefault: false,
  requiredFields: ['name', 'gender', 'age', 'role', 'personality'],
  fieldDescriptions: {
    name: '角色姓名',
    gender: '性别',
    age: '年龄',
    role: '角色类型',
    personality: '性格特征',
  },
});

export const duplicateCardPromptTemplate = (prompt: CardPromptTemplate): CardPromptTemplate => ({
  ...prompt,
  id: Date.now().toString(),
  name: `${prompt.name} (副本)`,
  isDefault: false,
});

export const importCardPromptTemplates = (
  jsonString: string,
  validateCardPromptTemplate: (template: CardPromptTemplate) => { isValid: boolean; errors: string[] },
): CardPromptImportResult => {
  try {
    const imported = JSON.parse(jsonString) as CardPromptTemplate[];
    const validPrompts = imported.filter((prompt) => validateCardPromptTemplate(prompt).isValid);
    const prompts = validPrompts.map((prompt) => ({
      ...prompt,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
      isDefault: false,
    }));

    return {
      success: true,
      count: prompts.length,
      prompts,
    };
  } catch (error) {
    return {
      success: false,
      error: '导入失败：JSON格式错误',
    };
  }
};
