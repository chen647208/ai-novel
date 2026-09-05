/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */


import { logger } from '../../../shared/utils/logger';
import { i18n } from '@/i18n';
import { 
  type EmbeddingModelConfig, 
  type EmbeddingConnectionTestResult 
} from '../../../../shared/types';
import { asRecord, asRecords, asStr, asNum, asNumArr } from '../../../shared/utils/loose';
import { embeddingConfigStore } from '../../../shared/services/embeddingConfigStore';

/**
 * Embedding模型管理服务
 * 负责管理Embedding模型配置、测试连接、获取模型列表和调用API
 */
export class EmbeddingModelService {
  private static instance: EmbeddingModelService;
  private currentConfig: EmbeddingModelConfig | null = null;

  private constructor() {}

  static getInstance(): EmbeddingModelService {
    if (!EmbeddingModelService.instance) {
      EmbeddingModelService.instance = new EmbeddingModelService();
    }
    return EmbeddingModelService.instance;
  }

  /**
   * 获取所有Embedding模型配置
   */
  async getAllConfigs(): Promise<EmbeddingModelConfig[]> {
    return await embeddingConfigStore.getAll();
  }

  /**
   * 保存Embedding模型配置
   */
  async saveConfig(config: EmbeddingModelConfig): Promise<boolean> {
    return await embeddingConfigStore.save(config);
  }

  /**
   * 删除Embedding模型配置
   */
  async deleteConfig(id: string): Promise<boolean> {
    return await embeddingConfigStore.remove(id);
  }

  /**
   * 设置激活的Embedding模型配置
   */
  async setActiveConfig(id: string | null): Promise<boolean> {
    return await embeddingConfigStore.setActive(id);
  }

  /**
   * 获取激活的Embedding模型配置
   */
  async getActiveConfig(): Promise<EmbeddingModelConfig | null> {
    if (this.currentConfig) {
      return this.currentConfig;
    }
    this.currentConfig = await embeddingConfigStore.getActive();
    return this.currentConfig;
  }

  /**
   * 获取指定ID的Embedding模型配置
   */
  async getConfigById(id: string): Promise<EmbeddingModelConfig | null> {
    return await embeddingConfigStore.getById(id);
  }

  /**
   * 清除当前缓存的配置
   */
  clearCache(): void {
    this.currentConfig = null;
  }

  /**
   * 测试Embedding模型连接
   */
  async testConnection(config: EmbeddingModelConfig): Promise<EmbeddingConnectionTestResult> {
    const testText = '这是一个连接测试句子，用于验证Embedding服务是否正常工作。';
    const startTime = Date.now();

    try {
      const embeddings = await this.fetchEmbeddings(config, [testText]);
      const latency = Date.now() - startTime;
      
      if (!embeddings || embeddings.length === 0) {
        return {
          success: false,
          dimensions: 0,
          latency,
          error: i18n.t('settings:embedding.emptyVector')
        };
      }

      const actualDimensions = embeddings[0]?.length ?? 0;
      
      // 验证维度是否匹配配置
      if (actualDimensions !== config.dimensions) {
        console.warn(`维度不匹配：配置为${config.dimensions}，实际为${actualDimensions}`);
      }

      return {
        success: true,
        dimensions: actualDimensions,
        latency,
        modelName: config.modelName
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        dimensions: 0,
        latency,
        error: error instanceof Error ? error.message : i18n.t('settings:embedding.connTestFailed')
      };
    }
  }

  /**
   * 获取可用模型列表
   */
  async fetchModels(config: EmbeddingModelConfig): Promise<string[]> {
    switch (config.provider) {
      case 'ollama':
        return this.fetchOllamaModels(config);
      case 'lmstudio':
      case 'siliconflow':
      case 'bailian':
      case 'volcano':
      case 'openai-compatible':
        return this.fetchOpenAICompatibleModels(config);
      default:
        return [];
    }
  }

  /**
   * 从Ollama获取模型列表
   */
  private async fetchOllamaModels(config: EmbeddingModelConfig): Promise<string[]> {
    const endpoint = config.endpoint.replace(/\/+$/, '');
    const url = `${endpoint}/api/tags`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Ollama请求失败: ${response.status} ${response.statusText}`);
      }

      const data = asRecord(await response.json());
      // Ollama返回的模型列表格式：{ models: [{ name: 'xxx' }] }
      return asRecords(data.models).map((m) => asStr(m.name)).filter((name) => name !== '');
    } catch (error) {
      console.error('获取Ollama模型列表失败:', error);
      throw error;
    }
  }

  /**
   * 从OpenAI兼容API获取模型列表
   */
  private async fetchOpenAICompatibleModels(config: EmbeddingModelConfig): Promise<string[]> {
    const endpoint = config.endpoint.replace(/\/+$/, '');
    const url = `${endpoint}/models`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        // 某些服务商可能不支持/models端点，返回空列表
        if (response.status === 404) {
          console.warn('该服务商不支持获取模型列表，请手动输入模型名称');
          return [];
        }
        throw new Error(i18n.t('settings:embedding.apiRequestFailed', { status: response.status, detail: response.statusText }));
      }

      const data = asRecord(await response.json());
      // OpenAI兼容格式：{ data: [{ id: 'xxx' }] }
      const models = asRecords(data.data).map((m) => asStr(m.id)).filter((id) => id !== '');
      
      // 过滤出可能的embedding模型（根据名称关键词）
      const embeddingKeywords = ['embed', 'bge', 'gte', 'text-embedding', 'm3', 'bce'];
      const embeddingModels = models.filter(name => 
        embeddingKeywords.some(keyword => name.toLowerCase().includes(keyword))
      );
      
      return embeddingModels.length > 0 ? embeddingModels : models;
    } catch (error) {
      console.error('获取模型列表失败:', error);
      // 某些服务商可能不支持此接口，返回空列表不报错
      return [];
    }
  }

  /**
   * 获取文本的嵌入向量（批量）
   */
  async getEmbeddings(config: EmbeddingModelConfig, texts: string[]): Promise<number[][]> {
    // 按batchSize分批处理
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += config.batchSize) {
      batches.push(texts.slice(i, i + config.batchSize));
    }

    const allEmbeddings: number[][] = [];

    for (const batch of batches) {
      const batchEmbeddings = await this.fetchEmbeddings(config, batch);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  /**
   * 获取单个文本的嵌入向量
   */
  async getEmbedding(config: EmbeddingModelConfig, text: string): Promise<number[]> {
    const embeddings = await this.getEmbeddings(config, [text]);
    return embeddings[0] ?? [];
  }

  /**
   * 实际调用API获取嵌入向量
   */
  private async fetchEmbeddings(
    config: EmbeddingModelConfig, 
    texts: string[]
  ): Promise<number[][]> {
    switch (config.provider) {
      case 'ollama':
        return this.fetchOllamaEmbeddings(config, texts);
      case 'lmstudio':
      case 'siliconflow':
      case 'bailian':
      case 'volcano':
      case 'openai-compatible':
        return this.fetchOpenAICompatibleEmbeddings(config, texts);
      default:
        throw new Error(i18n.t('settings:embedding.unsupportedProvider', { provider: config.provider }));
    }
  }

  /**
   * 调用Ollama Embedding API
   */
  private async fetchOllamaEmbeddings(
    config: EmbeddingModelConfig,
    texts: string[]
  ): Promise<number[][]> {
    const endpoint = config.endpoint.replace(/\/+$/, '');
    const embeddings: number[][] = [];

    // Ollama的embedding API一次只能处理一个文本
    for (const text of texts) {
      const response = await fetch(`${endpoint}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.modelName,
          prompt: text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(i18n.t('settings:embedding.ollamaEmbedFailed', { status: response.status, detail: errorText }));
      }

      const data = asRecord(await response.json());
      const embedding = asNumArr(data.embedding);
      
      if (embedding.length === 0) {
        throw new Error(i18n.t('settings:embedding.ollamaBadFormat'));
      }

      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * 调用OpenAI兼容Embedding API
   */
  private async fetchOpenAICompatibleEmbeddings(
    config: EmbeddingModelConfig,
    texts: string[]
  ): Promise<number[][]> {
    const endpoint = config.endpoint.replace(/\/+$/, '');
    const url = `${endpoint}/embeddings`;

    logger.debug(`调用Embedding API: ${url}`);
    logger.debug(`模型: ${config.modelName}, 文本数量: ${texts.length}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    // 准备请求体
    const requestBody: Record<string, unknown> = {
      model: config.modelName,
      input: texts,
      encoding_format: 'float'
    };

    // 阿里百炼支持动态维度调整
    if (config.provider === 'bailian' && config.dimensions) {
      requestBody.dimensions = config.dimensions;
    }

    logger.debug('请求体:', JSON.stringify(requestBody, null, 2));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      logger.debug('发送请求...');
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      logger.debug(`响应状态: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API错误响应:', errorText);
        const errorData = asRecord(await response.json().catch(() => ({})));
        const errorMessage = asStr(asRecord(errorData.error).message) || asStr(errorData.message) || i18n.t('settings:embedding.apiRequestFailed', { status: response.status, detail: errorText });
        throw new Error(errorMessage);
      }

      const data = asRecord(await response.json());
      logger.debug('API响应成功, 数据键:', Object.keys(data));

      const items = asRecords(data.data);
      if (items.length === 0) {
        console.error('API返回格式不正确:', data);
        throw new Error(i18n.t('settings:embedding.embedBadFormat'));
      }

      logger.debug(`获取到 ${items.length} 个嵌入向量`);

      // 按index排序，确保顺序正确
      const sortedEmbeddings = items
        .sort((a, b) => asNum(a.index) - asNum(b.index))
        .map((item) => asNumArr(item.embedding));

      logger.debug(`第一个嵌入向量维度: ${sortedEmbeddings[0]?.length}`);

      // 如果需要归一化
      if (config.normalizeEmbeddings) {
        return sortedEmbeddings.map((emb) => this.normalizeVector(emb));
      }

      return sortedEmbeddings;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(i18n.t('settings:embedding.requestTimeout', { timeout: config.timeout }));
      }
      throw error;
    }
  }

  /**
   * 向量归一化（L2范数）
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return vector;
    return vector.map(val => val / norm);
  }

  /**
   * 计算余弦相似度
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      console.warn(`向量维度不匹配: ${embedding1.length} vs ${embedding2.length}`);
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      const a = embedding1[i] ?? 0;
      const b = embedding2[i] ?? 0;
      dotProduct += a * b;
      norm1 += a * a;
      norm2 += b * b;
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * 验证配置是否有效
   */
  validateConfig(config: EmbeddingModelConfig): { valid: boolean; error?: string } {
    if (!config.endpoint) {
      return { valid: false, error: i18n.t('settings:embedding.validateEndpointEmpty') };
    }

    if (!config.modelName) {
      return { valid: false, error: i18n.t('settings:embedding.validateModelNameEmpty') };
    }

    // 检查端点URL格式
    try {
      new URL(config.endpoint);
    } catch {
      return { valid: false, error: i18n.t('settings:embedding.validateEndpointFormat') };
    }

    // 云服务商需要API Key（本地部署不需要）
    const localProviders = ['ollama', 'lmstudio'];
    const isLocalProvider = localProviders.includes(config.provider);
    if (!isLocalProvider && !config.apiKey) {
      return { valid: false, error: i18n.t('settings:embedding.validateCloudNeedsKey') };
    }

    // 验证维度
    if (config.dimensions <= 0) {
      return { valid: false, error: i18n.t('settings:embedding.validateDimensions') };
    }

    // 验证批处理大小
    if (config.batchSize <= 0 || config.batchSize > 100) {
      return { valid: false, error: i18n.t('settings:embedding.validateBatchSize') };
    }

    return { valid: true };
  }
}

// 导出单例实例
export const embeddingModelService = EmbeddingModelService.getInstance();







