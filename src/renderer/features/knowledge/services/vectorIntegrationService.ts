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
import { vectorService } from './vectorService';
import { embeddingProvider } from './embeddingProvider';
import { 
  type VectorDocument, 
  type SearchResult, 
  type SearchOptions, 
  type CollectionStats,
  type HybridSearchResult,
  type HybridSearchOptions,
  type ConsistencyCheckResult,
  type KnowledgeItem
} from '../../../../shared/types';

/**
 * 向量集成服务
 * 协调向量数据库和嵌入服务，提供高级语义搜索功能
 * 支持自动降级：API Embedding失败时回退到本地TF-IDF
 */
export class VectorIntegrationService {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化集成服务
   */
  async initialize(): Promise<boolean> {
    try {
      // 初始化向量服务
      const vectorInitialized = await vectorService.initialize();

      // 初始化嵌入提供者（内部完成 API/本地选择与后备）
      const embeddingInitialized = await embeddingProvider.initialize();

      this.isInitialized = vectorInitialized && embeddingInitialized;

      if (this.isInitialized) {
        logger.debug('VectorIntegrationService initialized successfully');
      } else {
        logger.error('Failed to initialize VectorIntegrationService');
      }

      return this.isInitialized;
    } catch (error) {
      logger.error('Failed to initialize VectorIntegrationService:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * 刷新 Embedding 服务配置
   * 在设置中更改配置后调用
   */
  async refreshEmbeddingConfig(): Promise<void> {
    await embeddingProvider.refresh();
  }

  /**
   * 索引知识库文档
   */
  async indexKnowledgeBase(
    projectId: string,
    knowledgeItems: KnowledgeItem[]
  ): Promise<{
    success: boolean;
    indexedCount: number;
    error?: string;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.debug(`indexKnowledgeBase started for project ${projectId}, items: ${knowledgeItems.length}`);
      
      // 获取当前使用的嵌入服务（支持自动降级）
      const embeddingSvc = await embeddingProvider.get();
      logger.debug(`Using embedding service with dimensions: ${embeddingSvc.getDimensions()}`);
      
      // 将知识库项目转换为向量文档
      logger.debug('Creating vector documents...');
      const vectorDocuments = await embeddingSvc.createVectorDocuments(
        projectId,
        knowledgeItems.map(item => ({
          id: item.id,
          content: item.content,
          category: item.category,
          type: item.type,
          size: item.size,
          addedAt: item.addedAt
        }))
      );

      logger.debug(`Created ${vectorDocuments.length} vector documents`);

      if (vectorDocuments.length === 0) {
        return {
          success: false,
          indexedCount: 0,
          error: 'No vector documents created'
        };
      }

      // 添加到向量数据库
      logger.debug('Adding documents to vector database...');
      const documentIds = await vectorService.addDocuments(projectId, vectorDocuments);
      logger.debug(`Successfully added ${documentIds.length} documents to vector database`);
      
      return {
        success: true,
        indexedCount: documentIds.length
      };
    } catch (error) {
      logger.error(`Failed to index knowledge base for project ${projectId}:`, error);
      return {
        success: false,
        indexedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 语义搜索知识库
   */
  async semanticSearchKnowledge(
    projectId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 获取当前使用的嵌入服务（支持自动降级）
      const embeddingSvc = await embeddingProvider.get();
      
      // 生成查询的嵌入向量
      const queryEmbedding = await embeddingSvc.embedText(query);
      
      // 执行语义搜索
      return await vectorService.semanticSearch(projectId, queryEmbedding, options);
    } catch (error) {
      logger.error(`Failed to perform semantic search for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * 混合搜索知识库
   */
  async hybridSearchKnowledge(
    projectId: string,
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 获取当前使用的嵌入服务（支持自动降级）
      const embeddingSvc = await embeddingProvider.get();
      
      // 生成查询的嵌入向量
      const queryEmbedding = await embeddingSvc.embedText(query);
      
      // 执行混合搜索
      return await vectorService.hybridSearch(projectId, queryEmbedding, query, options);
    } catch (error) {
      logger.error(`Failed to perform hybrid search for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * 获取向量数据库统计信息
   */
  async getVectorStats(projectId: string): Promise<CollectionStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 获取当前使用的嵌入服务的维度
      const embeddingSvc = await embeddingProvider.get();
      const dimensions = embeddingSvc.getDimensions();
      
      return await vectorService.getCollectionStats(projectId, dimensions);
    } catch (error) {
      logger.error(`Failed to get vector stats for project ${projectId}:`, error);
      return {
        count: 0,
        dimensions: embeddingProvider.getActive().getDimensions(),
        categories: {},
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * 检查数据一致性
   */
  async checkConsistency(projectId: string): Promise<ConsistencyCheckResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await vectorService.checkConsistency(projectId);
    } catch (error) {
      logger.error(`Failed to check consistency for project ${projectId}:`, error);
      return {
        isConsistent: false,
        conflicts: [{
          type: 'check_failed',
          description: i18n.t('knowledge:conflict.checkFailed', { error: error instanceof Error ? error.message : 'Unknown error' }),
          severity: 'high',
          suggestion: i18n.t('knowledge:conflict.checkDbConnection')
        }],
        score: 0
      };
    }
  }

  /**
   * 清理项目向量数据
   */
  async cleanupProject(projectId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await vectorService.cleanupCollection(projectId);
    } catch (error) {
      logger.error(`Failed to cleanup project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * 批量更新知识库
   */
  async batchUpdateKnowledge(
    projectId: string,
    updates: Array<{
      action: 'add' | 'update' | 'delete';
      item: KnowledgeItem;
    }>
  ): Promise<{
    success: boolean;
    added: number;
    updated: number;
    deleted: number;
    errors: string[];
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = {
      success: true,
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [] as string[]
    };

    for (const update of updates) {
      try {
        switch (update.action) {
          case 'add': {
            // 获取当前使用的嵌入服务
            const embeddingSvc = await embeddingProvider.get();
            
            // 创建向量文档并添加
            const vectorDocuments = await embeddingSvc.createVectorDocuments(
              projectId,
              [{
                id: update.item.id,
                content: update.item.content,
                category: update.item.category,
                type: update.item.type,
                size: update.item.size,
                addedAt: update.item.addedAt
              }]
            );
            
            if (vectorDocuments.length > 0) {
              await vectorService.addDocuments(projectId, vectorDocuments);
              result.added++;
            }
            break;
          }

          case 'update': {
            // 获取当前使用的嵌入服务
            const embeddingSvc2 = await embeddingProvider.get();
            
            // 先删除旧文档，再添加新文档
            const updatedDocuments = await embeddingSvc2.createVectorDocuments(
              projectId,
              [{
                id: update.item.id,
                content: update.item.content,
                category: update.item.category,
                type: update.item.type,
                size: update.item.size,
                addedAt: update.item.addedAt
              }]
            );
            
            const firstDoc = updatedDocuments[0];
            if (firstDoc) {
              // 删除所有该知识库项目的分块
              const stats = await this.getVectorStats(projectId);
              if (stats.count > 0) {
                // 这里需要实现根据knowledgeItemId删除文档的逻辑
                // 暂时使用简化实现
                await vectorService.updateDocument(projectId, firstDoc);
              }
              result.updated++;
            }
            break;
          }

          case 'delete':
            // 删除所有相关文档
            // 这里需要实现根据knowledgeItemId删除文档的逻辑
            // 暂时使用简化实现
            result.deleted++;
            break;
        }
      } catch (error) {
        const errorMsg = `Failed to ${update.action} knowledge item ${update.item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    vectorService: boolean;
    embeddingService: boolean;
    embeddingServiceType: 'api' | 'local';
    embeddingModel: string;
    embeddingDimensions: number;
    vocabularySize: number;
  } {
    const embeddingStatus = embeddingProvider.getActive().getStatus();

    return {
      vectorService: this.isInitialized,
      embeddingService: embeddingStatus.isReady,
      embeddingServiceType: embeddingProvider.getMode(),
      embeddingModel: embeddingStatus.modelName,
      embeddingDimensions: embeddingStatus.dimensions,
      vocabularySize: embeddingProvider.getVocabularySize()
    };
  }

  /**
   * 导出向量数据（用于备份或迁移）
   */
  async exportVectorData(projectId: string): Promise<{
    projectId: string;
    documents: VectorDocument[];
    stats: CollectionStats;
    exportedAt: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const stats = await this.getVectorStats(projectId);
      
      // 注意：实际实现需要从向量数据库获取所有文档
      // 这里返回简化版本
      return {
        projectId,
        documents: [], // 实际实现中这里应该包含所有文档
        stats,
        exportedAt: Date.now()
      };
    } catch (error) {
      logger.error(`Failed to export vector data for project ${projectId}:`, error);
      throw error;
    }
  }
}

// 导出单例实例
export const vectorIntegrationService = new VectorIntegrationService();








