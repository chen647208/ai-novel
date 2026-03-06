import { vectorService } from './vectorService';
import { embeddingService as simpleEmbeddingService, EmbeddingService } from './embeddingService';
import { apiEmbeddingService } from './apiEmbeddingService';
import { embeddingModelService } from './embeddingModelService';
import { 
  VectorDocument, 
  SearchResult, 
  SearchOptions, 
  CollectionStats, 
  RelevantContext, 
  ContextOptions,
  HybridSearchResult,
  HybridSearchOptions,
  ConsistencyCheckResult,
  KnowledgeCategory,
  KnowledgeItem
} from '../types';

/**
 * 向量集成服务
 * 协调向量数据库和嵌入服务，提供高级语义搜索功能
 * 支持自动降级：API Embedding失败时回退到本地TF-IDF
 */
export class VectorIntegrationService {
  private isInitialized: boolean = false;
  private currentEmbeddingService: EmbeddingService = simpleEmbeddingService;
  private useAPIEmbedding: boolean = false;

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
      
      // 尝试初始化 API Embedding 服务
      const apiEmbeddingInitialized = await apiEmbeddingService.initialize();
      
      // 初始化本地简化版（作为后备）
      const simpleEmbeddingInitialized = await simpleEmbeddingService.initialize();
      
      // 确定使用哪个嵌入服务
      this.useAPIEmbedding = apiEmbeddingInitialized;
      this.currentEmbeddingService = apiEmbeddingInitialized ? apiEmbeddingService : simpleEmbeddingService;
      
      this.isInitialized = vectorInitialized && (apiEmbeddingInitialized || simpleEmbeddingInitialized);
      
      if (this.isInitialized) {
        console.log('VectorIntegrationService initialized successfully');
        console.log(`Using embedding service: ${this.useAPIEmbedding ? 'API' : 'Local TF-IDF'}`);
      } else {
        console.error('Failed to initialize VectorIntegrationService');
      }
      
      return this.isInitialized;
    } catch (error) {
      console.error('Failed to initialize VectorIntegrationService:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * 获取当前使用的 Embedding 服务
   * 优先使用 API，失败时自动降级到本地服务
   */
  private async getEmbeddingService(): Promise<EmbeddingService> {
    if (this.useAPIEmbedding) {
      // 检查 API 服务是否仍然可用
      const config = await embeddingModelService.getActiveConfig();
      console.log('getEmbeddingService - API mode, active config:', config ? {
        name: config.name,
        testStatus: config.testStatus,
        dimensions: config.dimensions
      } : 'null');
      
      if (config && config.testStatus === 'success') {
        console.log('Using API Embedding Service');
        return apiEmbeddingService;
      }
      // API 不可用，降级到本地服务
      console.warn('API Embedding not available (config missing or not tested), falling back to local TF-IDF');
      this.useAPIEmbedding = false;
      this.currentEmbeddingService = simpleEmbeddingService;
    }
    console.log('Using Local TF-IDF Embedding Service, dimensions:', this.currentEmbeddingService.getDimensions());
    return this.currentEmbeddingService;
  }

  /**
   * 刷新 Embedding 服务配置
   * 在设置中更改配置后调用
   */
  async refreshEmbeddingConfig(): Promise<void> {
    // 清除 API 服务的缓存
    apiEmbeddingService.reloadConfig();
    
    // 重新初始化
    const apiEmbeddingInitialized = await apiEmbeddingService.initialize();
    
    this.useAPIEmbedding = apiEmbeddingInitialized;
    this.currentEmbeddingService = apiEmbeddingInitialized ? apiEmbeddingService : simpleEmbeddingService;
    
    console.log(`Embedding service refreshed: ${this.useAPIEmbedding ? 'API' : 'Local TF-IDF'}`);
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
      console.log(`indexKnowledgeBase started for project ${projectId}, items: ${knowledgeItems.length}`);
      
      // 获取当前使用的嵌入服务（支持自动降级）
      const embeddingSvc = await this.getEmbeddingService();
      console.log(`Using embedding service with dimensions: ${embeddingSvc.getDimensions()}`);
      
      // 将知识库项目转换为向量文档
      console.log('Creating vector documents...');
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

      console.log(`Created ${vectorDocuments.length} vector documents`);

      if (vectorDocuments.length === 0) {
        return {
          success: false,
          indexedCount: 0,
          error: 'No vector documents created'
        };
      }

      // 添加到向量数据库
      console.log('Adding documents to vector database...');
      const documentIds = await vectorService.addDocuments(projectId, vectorDocuments);
      console.log(`Successfully added ${documentIds.length} documents to vector database`);
      
      return {
        success: true,
        indexedCount: documentIds.length
      };
    } catch (error) {
      console.error(`Failed to index knowledge base for project ${projectId}:`, error);
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
      const embeddingSvc = await this.getEmbeddingService();
      
      // 生成查询的嵌入向量
      const queryEmbedding = await embeddingSvc.embedText(query);
      
      // 执行语义搜索
      return await vectorService.semanticSearch(projectId, queryEmbedding, options);
    } catch (error) {
      console.error(`Failed to perform semantic search for project ${projectId}:`, error);
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
      const embeddingSvc = await this.getEmbeddingService();
      
      // 生成查询的嵌入向量
      const queryEmbedding = await embeddingSvc.embedText(query);
      
      // 执行混合搜索
      return await vectorService.hybridSearch(projectId, queryEmbedding, query, options);
    } catch (error) {
      console.error(`Failed to perform hybrid search for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * 获取写作相关上下文
   */
  async getWritingContext(
    projectId: string,
    query: string,
    options: ContextOptions = {}
  ): Promise<RelevantContext> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 执行搜索
      const searchResults = await this.hybridSearchKnowledge(projectId, query, {
        limit: options.limit || 5,
        threshold: options.threshold || 0.3,
        filter: options.categories ? { category: { $in: options.categories } } : undefined
      });

      // 生成上下文摘要
      let summary: string | undefined;
      if (options.includeSummary && searchResults.length > 0) {
        summary = this.generateContextSummary(searchResults, query);
      }

      return {
        projectId,
        query,
        results: searchResults,
        summary,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Failed to get writing context for project ${projectId}:`, error);
      return {
        projectId,
        query,
        results: [],
        timestamp: Date.now()
      };
    }
  }

  /**
   * 生成上下文摘要
   */
  private generateContextSummary(results: SearchResult[], query: string): string {
    if (results.length === 0) {
      return `未找到与"${query}"相关的知识库内容。`;
    }

    const topResults = results.slice(0, 3);
    const categories = new Set<string>();
    
    topResults.forEach(result => {
      if (result.metadata?.category) {
        categories.add(result.metadata.category);
      }
    });

    const categoryList = Array.from(categories).join('、');
    const topContent = topResults.map((result, index) => 
      `${index + 1}. ${result.content.substring(0, 100)}...`
    ).join('\n');

    return `找到${results.length}条与"${query}"相关的内容，主要类别：${categoryList}。\n\n相关内容摘要：\n${topContent}`;
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
      const embeddingSvc = await this.getEmbeddingService();
      const dimensions = embeddingSvc.getDimensions();
      
      return await vectorService.getCollectionStats(projectId, dimensions);
    } catch (error) {
      console.error(`Failed to get vector stats for project ${projectId}:`, error);
      return {
        count: 0,
        dimensions: this.currentEmbeddingService.getDimensions(),
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
      console.error(`Failed to check consistency for project ${projectId}:`, error);
      return {
        isConsistent: false,
        conflicts: [{
          type: 'check_failed',
          description: `一致性检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'high',
          suggestion: '检查向量数据库连接和服务状态'
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
      console.error(`Failed to cleanup project ${projectId}:`, error);
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
          case 'add':
            // 获取当前使用的嵌入服务
            const embeddingSvc = await this.getEmbeddingService();
            
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

          case 'update':
            // 获取当前使用的嵌入服务
            const embeddingSvc2 = await this.getEmbeddingService();
            
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
            
            if (updatedDocuments.length > 0) {
              // 删除所有该知识库项目的分块
              const stats = await this.getVectorStats(projectId);
              if (stats.count > 0) {
                // 这里需要实现根据knowledgeItemId删除文档的逻辑
                // 暂时使用简化实现
                await vectorService.updateDocument(projectId, updatedDocuments[0]);
              }
              result.updated++;
            }
            break;

          case 'delete':
            // 删除所有相关文档
            // 这里需要实现根据knowledgeItemId删除文档的逻辑
            // 暂时使用简化实现
            result.deleted++;
            break;
        }
      } catch (error) {
        const errorMsg = `Failed to ${update.action} knowledge item ${update.item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
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
    const embeddingStatus = this.currentEmbeddingService.getStatus();
    
    return {
      vectorService: this.isInitialized,
      embeddingService: embeddingStatus.isReady,
      embeddingServiceType: this.useAPIEmbedding ? 'api' : 'local',
      embeddingModel: embeddingStatus.modelName,
      embeddingDimensions: embeddingStatus.dimensions,
      vocabularySize: (simpleEmbeddingService as any).getVocabularySize ? 
        (simpleEmbeddingService as any).getVocabularySize() : 0
    };
  }

  /**
   * 测试语义搜索功能
   */
  async testSemanticSearch(
    projectId: string,
    testQueries: string[] = [
      '主角的性格特点',
      '故事的主要冲突',
      '小说的主题思想',
      '重要场景描述'
    ]
  ): Promise<Array<{
    query: string;
    results: number;
    topScore: number;
    executionTime: number;
  }>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const testResults = [];

    for (const query of testQueries) {
      const startTime = Date.now();
      
      try {
        const results = await this.semanticSearchKnowledge(projectId, query, {
          limit: 3,
          threshold: 0.1
        });

        const executionTime = Date.now() - startTime;
        
        testResults.push({
          query,
          results: results.length,
          topScore: results.length > 0 ? results[0].score : 0,
          executionTime
        });
      } catch (error) {
        console.error(`Test failed for query "${query}":`, error);
        testResults.push({
          query,
          results: 0,
          topScore: 0,
          executionTime: Date.now() - startTime
        });
      }
    }

    return testResults;
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
      console.error(`Failed to export vector data for project ${projectId}:`, error);
      throw error;
    }
  }
}

// 导出单例实例
export const vectorIntegrationService = new VectorIntegrationService();
