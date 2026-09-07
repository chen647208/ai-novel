/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { logger } from '../../../shared/utils/logger';
import { embeddingService as simpleEmbeddingService, type EmbeddingService } from './embeddingService';
import { apiEmbeddingService } from './apiEmbeddingService';
import { embeddingModelService } from '../../settings/services/embeddingModelService';

export type EmbeddingMode = 'api' | 'local';

/**
 * Embedding 提供者
 *
 * 统一封装「API 嵌入」与「本地 TF-IDF 嵌入」两种实现的选择与自动降级策略，
 * 使上层（向量集成服务等）无需关心具体用哪个嵌入后端：
 * - initialize()：分别初始化两种实现，API 可用则优先选择 API，否则回退本地；
 * - get()：每次取用时校验 API 配置是否仍然有效（testStatus === 'success'），
 *   失效则自动降级到本地并记住降级结果；
 * - refresh()：设置变更后重新加载配置并重选后端。
 */
export class EmbeddingProvider {
  private current: EmbeddingService = simpleEmbeddingService;
  private useAPI = false;

  /**
   * 初始化两种嵌入实现并确定首选后端。
   * @returns 只要任一后端可用即返回 true
   */
  async initialize(): Promise<boolean> {
    const apiReady = await apiEmbeddingService.initialize();
    const simpleReady = await simpleEmbeddingService.initialize();
    this.useAPI = apiReady;
    this.current = apiReady ? apiEmbeddingService : simpleEmbeddingService;
    logger.debug(`EmbeddingProvider initialized using ${this.useAPI ? 'API' : 'Local TF-IDF'} embedding`);
    return apiReady || simpleReady;
  }

  /**
   * 获取当前应使用的嵌入服务（支持运行时自动降级）。
   */
  async get(): Promise<EmbeddingService> {
    if (this.useAPI) {
      const config = await embeddingModelService.getActiveConfig();
      if (config && config.testStatus === 'success') {
        logger.debug('Using API Embedding Service');
        return apiEmbeddingService;
      }
      logger.warn('API Embedding not available (config missing or not tested), falling back to local TF-IDF');
      this.useAPI = false;
      this.current = simpleEmbeddingService;
    }
    logger.debug('Using Local TF-IDF Embedding Service, dimensions:', this.current.getDimensions());
    return this.current;
  }

  /**
   * 重新加载配置并重选后端（设置变更后调用）。
   */
  async refresh(): Promise<void> {
    apiEmbeddingService.reloadConfig();
    const apiReady = await apiEmbeddingService.initialize();
    this.useAPI = apiReady;
    this.current = apiReady ? apiEmbeddingService : simpleEmbeddingService;
    logger.debug(`EmbeddingProvider refreshed to ${this.useAPI ? 'API' : 'Local TF-IDF'} embedding`);
  }

  /** 当前选择模式（初始化/刷新时的选择结果，不含运行时降级）。 */
  getMode(): EmbeddingMode {
    return this.useAPI ? 'api' : 'local';
  }

  /** 当前后端实例（用于读取状态、维度等同步信息）。 */
  getActive(): EmbeddingService {
    return this.current;
  }

  /** 本地词表大小（仅本地 TF-IDF 提供，API 模式返回 0）。 */
  getVocabularySize(): number {
    return simpleEmbeddingService.getVocabularySize?.() ?? 0;
  }
}

export const embeddingProvider = new EmbeddingProvider();
