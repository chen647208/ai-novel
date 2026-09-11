/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */


import { Boxes, Cloud, Cpu, Flame, Globe, type LucideIcon,Monitor } from 'lucide-react';

import { type EmbeddingModelProvider } from '../../shared/types';

/**
 * Embedding 服务商预设。展示文案（名称/描述/提示/模型说明/特性）以 i18n 键存储于
 * providers 命名空间，渲染时用 dt()/dtList() 解析；模型名与维度等为语言无关数据。
 */
export interface EmbeddingProviderInfo {
  id: EmbeddingModelProvider;
  /** providers:embedding.<id>.name */
  nameKey: string;
  type: 'local' | 'cloud';
  endpoint: string;
  modelsEndpoint: string;
  embeddingEndpoint: string;
  apiKeyRequired: boolean;
  website?: string;
  apiApplyUrl?: string;
  /** providers:embedding.<id>.description */
  descriptionKey: string;
  recommendedModels: Array<{
    name: string;
    dimensions: number;
    maxTokens: number;
    /** providers:embedding.<id>.models.<index>（数组元素） */
    descriptionKey: string;
  }>;
  /** providers:embedding.<id>.tips（数组） */
  tipsKey: string;
  isChinese?: boolean;
  /** providers:embedding.<id>.specialFeatures（数组，可选） */
  specialFeaturesKey?: string;
}

export const embeddingProviders: EmbeddingProviderInfo[] = [
  // ========== 本地部署 ==========
  {
    id: 'ollama',
    nameKey: 'providers:embedding.ollama.name',
    type: 'local',
    endpoint: 'http://localhost:11434',
    modelsEndpoint: '/api/tags',
    embeddingEndpoint: '/api/embeddings',
    apiKeyRequired: false,
    descriptionKey: 'providers:embedding.ollama.description',
    recommendedModels: [
      { name: 'nomic-embed-text', dimensions: 768, maxTokens: 2048, descriptionKey: 'providers:embedding.ollama.models.0' },
      { name: 'all-minilm', dimensions: 384, maxTokens: 512, descriptionKey: 'providers:embedding.ollama.models.1' },
      { name: 'mxbai-embed-large', dimensions: 1024, maxTokens: 512, descriptionKey: 'providers:embedding.ollama.models.2' }
    ],
    tipsKey: 'providers:embedding.ollama.tips'
  },
  {
    id: 'lmstudio',
    nameKey: 'providers:embedding.lmstudio.name',
    type: 'local',
    endpoint: 'http://localhost:1234',
    modelsEndpoint: '/v1/models',
    embeddingEndpoint: '/v1/embeddings',
    apiKeyRequired: false,
    descriptionKey: 'providers:embedding.lmstudio.description',
    recommendedModels: [
      { name: 'sentence-transformers/all-MiniLM-L6-v2', dimensions: 384, maxTokens: 512, descriptionKey: 'providers:embedding.lmstudio.models.0' },
      { name: 'sentence-transformers/all-mpnet-base-v2', dimensions: 768, maxTokens: 512, descriptionKey: 'providers:embedding.lmstudio.models.1' },
      { name: 'BAAI/bge-large-zh-v1.5', dimensions: 1024, maxTokens: 512, descriptionKey: 'providers:embedding.lmstudio.models.2' }
    ],
    tipsKey: 'providers:embedding.lmstudio.tips'
  },

  // ========== 国内云服务商 ==========
  {
    id: 'siliconflow',
    nameKey: 'providers:embedding.siliconflow.name',
    type: 'cloud',
    endpoint: 'https://api.siliconflow.cn/v1',
    modelsEndpoint: '/models',
    embeddingEndpoint: '/embeddings',
    apiKeyRequired: true,
    website: 'https://siliconflow.cn',
    apiApplyUrl: 'https://siliconflow.cn/console/apikey',
    descriptionKey: 'providers:embedding.siliconflow.description',
    recommendedModels: [
      { name: 'BAAI/bge-m3', dimensions: 1024, maxTokens: 8192, descriptionKey: 'providers:embedding.siliconflow.models.0' },
      { name: 'Pro/BAAI/bge-m3', dimensions: 1024, maxTokens: 8192, descriptionKey: 'providers:embedding.siliconflow.models.1' },
      { name: 'BAAI/bge-large-zh-v1.5', dimensions: 1024, maxTokens: 512, descriptionKey: 'providers:embedding.siliconflow.models.2' },
      { name: 'Qwen/Qwen3-Embedding-8B', dimensions: 4096, maxTokens: 32768, descriptionKey: 'providers:embedding.siliconflow.models.3' },
      { name: 'Qwen/Qwen3-Embedding-4B', dimensions: 2048, maxTokens: 32768, descriptionKey: 'providers:embedding.siliconflow.models.4' }
    ],
    tipsKey: 'providers:embedding.siliconflow.tips',
    isChinese: true
  },
  {
    id: 'bailian',
    nameKey: 'providers:embedding.bailian.name',
    type: 'cloud',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelsEndpoint: '/models',
    embeddingEndpoint: '/embeddings',
    apiKeyRequired: true,
    website: 'https://bailian.aliyun.com',
    apiApplyUrl: 'https://bailian.aliyun.com/console#/api-key',
    descriptionKey: 'providers:embedding.bailian.description',
    recommendedModels: [
      { name: 'text-embedding-v3', dimensions: 1024, maxTokens: 8192, descriptionKey: 'providers:embedding.bailian.models.0' },
      { name: 'text-embedding-v2', dimensions: 1024, maxTokens: 8192, descriptionKey: 'providers:embedding.bailian.models.1' },
      { name: 'text-embedding-v1', dimensions: 1536, maxTokens: 2048, descriptionKey: 'providers:embedding.bailian.models.2' }
    ],
    tipsKey: 'providers:embedding.bailian.tips',
    isChinese: true,
    specialFeaturesKey: 'providers:embedding.bailian.specialFeatures'
  },
  {
    id: 'volcano',
    nameKey: 'providers:embedding.volcano.name',
    type: 'cloud',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
    modelsEndpoint: '/models',
    embeddingEndpoint: '/embeddings',
    apiKeyRequired: true,
    website: 'https://www.volcengine.com/product/ark',
    apiApplyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apikey',
    descriptionKey: 'providers:embedding.volcano.description',
    recommendedModels: [
      { name: 'doubao-embedding', dimensions: 1024, maxTokens: 4096, descriptionKey: 'providers:embedding.volcano.models.0' },
      { name: 'doubao-embedding-large', dimensions: 2048, maxTokens: 4096, descriptionKey: 'providers:embedding.volcano.models.1' }
    ],
    tipsKey: 'providers:embedding.volcano.tips',
    isChinese: true
  },

  // ========== 国际服务商 ==========
  {
    id: 'openai-compatible',
    nameKey: 'providers:embedding.openai-compatible.name',
    type: 'cloud',
    endpoint: 'https://api.openai.com/v1',
    modelsEndpoint: '/models',
    embeddingEndpoint: '/embeddings',
    apiKeyRequired: true,
    website: 'https://platform.openai.com',
    apiApplyUrl: 'https://platform.openai.com/api-keys',
    descriptionKey: 'providers:embedding.openai-compatible.description',
    recommendedModels: [
      { name: 'text-embedding-3-large', dimensions: 3072, maxTokens: 8192, descriptionKey: 'providers:embedding.openai-compatible.models.0' },
      { name: 'text-embedding-3-small', dimensions: 1536, maxTokens: 8192, descriptionKey: 'providers:embedding.openai-compatible.models.1' },
      { name: 'text-embedding-ada-002', dimensions: 1536, maxTokens: 8192, descriptionKey: 'providers:embedding.openai-compatible.models.2' }
    ],
    tipsKey: 'providers:embedding.openai-compatible.tips',
    isChinese: false
  }
];

// 快速添加配置模板
export const quickAddTemplates: Array<{
  id: string;
  nameKey: string;
  provider: EmbeddingModelProvider;
  modelName: string;
  Icon: LucideIcon;
}> = [
  { id: 'siliconflow-bge-m3', nameKey: 'providers:quickAdd.siliconflow-bge-m3', provider: 'siliconflow', modelName: 'BAAI/bge-m3', Icon: Boxes },
  { id: 'bailian-v3', nameKey: 'providers:quickAdd.bailian-v3', provider: 'bailian', modelName: 'text-embedding-v3', Icon: Flame },
  { id: 'ollama-local', nameKey: 'providers:quickAdd.ollama-local', provider: 'ollama', modelName: 'nomic-embed-text', Icon: Cpu },
  { id: 'openai-api', nameKey: 'providers:quickAdd.openai-api', provider: 'openai-compatible', modelName: 'text-embedding-3-small', Icon: Globe },
  { id: 'lmstudio-local', nameKey: 'providers:quickAdd.lmstudio-local', provider: 'lmstudio', modelName: 'sentence-transformers/all-MiniLM-L6-v2', Icon: Monitor },
  { id: 'volcano-ark', nameKey: 'providers:quickAdd.volcano-ark', provider: 'volcano', modelName: 'doubao-embedding', Icon: Cloud }
];

// 获取默认配置参数
export const getDefaultEmbeddingParams = (provider: EmbeddingModelProvider) => {
  switch (provider) {
    case 'ollama':
      return {
        dimensions: 768,
        maxSequenceLength: 2048,
        batchSize: 8,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'lmstudio':
      return {
        dimensions: 384,
        maxSequenceLength: 512,
        batchSize: 8,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'siliconflow':
      return {
        dimensions: 1024,
        maxSequenceLength: 8192,
        batchSize: 16,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'bailian':
      return {
        dimensions: 1024,
        maxSequenceLength: 8192,
        batchSize: 16,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'volcano':
      return {
        dimensions: 1024,
        maxSequenceLength: 4096,
        batchSize: 16,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'openai-compatible':
      return {
        dimensions: 1536,
        maxSequenceLength: 8192,
        batchSize: 16,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    default:
      return {
        dimensions: 1024,
        maxSequenceLength: 2048,
        batchSize: 8,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
  }
};
