import { VectorDocument, SearchResult, SearchOptions, CollectionStats, HybridSearchResult, HybridSearchOptions } from '../../../../shared/types';

/**
 * 向量数据库服务（支持Electron主进程代理 + 浏览器降级）
 * 
 * Electron环境：通过IPC调用主进程，使用Vectra库进行本地文件存储
 * 浏览器环境：自动降级为内存存储（数据不持久化）
 */
export class VectorService {
  private isInitialized: boolean = false;
  private isElectronMode: boolean = false;
  
  // 浏览器降级：内存存储
  private memoryCollections: Map<string, CollectionData> = new Map();

  constructor() {
    // 检测运行环境
    this.isElectronMode = this.detectElectron();
  }

  /**
   * 检测是否在Electron环境中运行
   */
  private detectElectron(): boolean {
    if (!window.electronAPI) {
      console.log('Running in browser mode (electronAPI not available)');
      return false;
    }
    if (!window.electronAPI.vector) {
      console.log('Running in browser mode (electronAPI.vector not available)');
      return false;
    }
    return true;
  }

  /**
   * 检查electronAPI是否可用
   */
  private ensureElectronAPI(): boolean {
    return this.isElectronMode && !!window.electronAPI?.vector;
  }

  /**
   * 获取集合数据（浏览器降级模式）
   */
  private getOrCreateMemoryCollection(projectId: string): CollectionData {
    if (!this.memoryCollections.has(projectId)) {
      this.memoryCollections.set(projectId, {
        documents: new Map(),
        createdAt: Date.now()
      });
    }
    return this.memoryCollections.get(projectId)!;
  }

  /**
   * 初始化向量数据库服务
   */
  async initialize(): Promise<boolean> {
    try {
      // Electron模式：通过IPC初始化
      if (this.ensureElectronAPI()) {
        console.log('Initializing Vector Service (via main process)...');
        const result = await window.electronAPI!.vector.initialize();
        
        if (result.success) {
          this.isInitialized = true;
          this.isElectronMode = true;
          console.log('VectorService initialized successfully (Electron mode)');
          return true;
        } else {
          console.error('VectorService initialization failed:', result.error);
          // 降级到内存模式
          this.isElectronMode = false;
        }
      }
      
      // 浏览器模式：内存存储
      console.log('VectorService initialized (Memory mode - data will not persist)');
      this.isInitialized = true;
      this.isElectronMode = false;
      return true;
    } catch (error) {
      console.error('Failed to initialize VectorService:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * 获取或创建项目集合
   * （主进程中自动处理，这里仅做初始化检查）
   */
  async getOrCreateCollection(projectId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.isInitialized;
  }

  /**
   * 添加文档到向量数据库
   */
  async addDocuments(projectId: string, documents: VectorDocument[]): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Electron模式：通过IPC调用主进程
      if (this.isElectronMode && this.ensureElectronAPI()) {
        const serializableDocs = documents.map(doc => ({
          id: doc.id,
          projectId: doc.projectId,
          knowledgeItemId: doc.knowledgeItemId,
          content: doc.content,
          embedding: doc.embedding,
          metadata: { ...doc.metadata }
        }));

        const result = await window.electronAPI!.vector.addDocuments(projectId, serializableDocs);
        
        if (result.success && result.ids) {
          console.log(`Added ${result.ids.length} documents to project ${projectId} (Electron)`);
          return result.ids;
        } else {
          throw new Error(result.error || 'Failed to add documents');
        }
      }
      
      // 浏览器模式：内存存储
      const collection = this.getOrCreateMemoryCollection(projectId);
      const ids: string[] = [];

      for (const doc of documents) {
        collection.documents.set(doc.id, {
          id: doc.id,
          projectId: doc.projectId,
          knowledgeItemId: doc.knowledgeItemId,
          content: doc.content,
          embedding: doc.embedding,
          metadata: { ...doc.metadata }
        });
        ids.push(doc.id);
      }

      console.log(`Added ${ids.length} documents to project ${projectId} (Memory)`);
      return ids;
    } catch (error) {
      console.error(`Failed to add documents to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * 更新文档向量
   */
  async updateDocument(projectId: string, document: VectorDocument): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Electron模式
      if (this.isElectronMode && this.ensureElectronAPI()) {
        const serializableDoc = {
          id: document.id,
          projectId: document.projectId,
          knowledgeItemId: document.knowledgeItemId,
          content: document.content,
          embedding: document.embedding,
          metadata: { ...document.metadata }
        };

        const result = await window.electronAPI!.vector.updateDocument(projectId, serializableDoc);
        return result.success;
      }
      
      // 浏览器模式
      const collection = this.getOrCreateMemoryCollection(projectId);
      collection.documents.set(document.id, {
        id: document.id,
        projectId: document.projectId,
        knowledgeItemId: document.knowledgeItemId,
        content: document.content,
        embedding: document.embedding,
        metadata: { ...document.metadata }
      });
      return true;
    } catch (error) {
      console.error(`Failed to update document ${document.id}:`, error);
      return false;
    }
  }

  /**
   * 删除文档
   */
  async deleteDocuments(projectId: string, documentIds: string[]): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Electron模式
      if (this.isElectronMode && this.ensureElectronAPI()) {
        const result = await window.electronAPI!.vector.deleteDocuments(projectId, documentIds);
        return result.success;
      }
      
      // 浏览器模式
      const collection = this.getOrCreateMemoryCollection(projectId);
      for (const id of documentIds) {
        collection.documents.delete(id);
      }
      return true;
    } catch (error) {
      console.error(`Failed to delete documents:`, error);
      return false;
    }
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.warn(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 语义搜索
   */
  async semanticSearch(
    projectId: string,
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Electron模式
      if (this.isElectronMode && this.ensureElectronAPI()) {
        const searchOptions = {
          limit: options.limit || 10,
          threshold: options.threshold || 0
        };

        const result = await window.electronAPI!.vector.semanticSearch(
          projectId, 
          queryEmbedding, 
          searchOptions
        );
        
        if (result.success && result.results) {
          return result.results as SearchResult[];
        } else {
          console.error('Semantic search failed:', result.error);
          return [];
        }
      }
      
      // 浏览器模式：内存搜索
      const collection = this.getOrCreateMemoryCollection(projectId);
      const limit = options.limit || 10;
      const threshold = options.threshold || 0;

      const results: SearchResult[] = [];

      for (const doc of collection.documents.values()) {
        const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
        
        if (score >= threshold) {
          results.push({
            document: {
              id: doc.id,
              projectId: doc.projectId,
              knowledgeItemId: doc.knowledgeItemId,
              content: doc.content,
              embedding: [], // 不返回完整嵌入向量
              metadata: { ...doc.metadata }
            },
            score,
            content: doc.content,
            metadata: { 
              ...doc.metadata,
              name: doc.knowledgeItemId
            }
          });
        }
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error(`Failed to perform semantic search for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * 混合搜索（语义+关键词）
   * 在主进程的语义搜索基础上，在渲染进程进行关键词匹配和分数合并
   */
  async hybridSearch(
    projectId: string,
    queryEmbedding: number[],
    queryText: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    try {
      // 获取更多语义搜索结果用于混合排序
      const semanticResults = await this.semanticSearch(projectId, queryEmbedding, {
        ...options,
        limit: (options.limit || 10) * 2
      });

      const keywords = queryText.toLowerCase().split(/\s+/).filter(k => k.length > 1);
      const allResults = new Map<string, HybridSearchResult>();

      // 处理语义搜索结果
      semanticResults.forEach(result => {
        allResults.set(result.document.id, {
          ...result,
          semanticScore: result.score,
          keywordScore: 0,
          combinedScore: result.score * (options.semanticWeight || 0.7)
        });
      });

      // 关键词匹配
      if (keywords.length > 0) {
        semanticResults.forEach(result => {
          const content = result.content.toLowerCase();
          let keywordMatches = 0;

          keywords.forEach(keyword => {
            if (content.includes(keyword)) {
              keywordMatches++;
            }
          });

          const keywordScore = keywordMatches / keywords.length;
          const existing = allResults.get(result.document.id);

          if (existing) {
            existing.keywordScore = keywordScore;
            existing.combinedScore = 
              (existing.semanticScore * (options.semanticWeight || 0.7)) +
              (keywordScore * (options.keywordWeight || 0.3));
          }
        });
      }

      // 按综合分数排序
      return Array.from(allResults.values())
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, options.limit || 10);
    } catch (error) {
      console.error(`Failed to perform hybrid search for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * 获取集合统计信息
   */
  async getCollectionStats(projectId: string, dimensions?: number): Promise<CollectionStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Electron模式
      if (this.isElectronMode && this.ensureElectronAPI()) {
        const result = await window.electronAPI!.vector.getStats(projectId);
        
        if (result.success && result.stats) {
          return result.stats as CollectionStats;
        } else {
          console.error('Get stats failed:', result.error);
        }
      }
      
      // 浏览器模式：从内存统计
      const collection = this.getOrCreateMemoryCollection(projectId);
      const count = collection.documents.size;
      
      const categories: Record<string, number> = {};
      let actualDimensions = dimensions || 384;

      for (const doc of collection.documents.values()) {
        const category = doc.metadata.category || 'unknown';
        categories[category] = (categories[category] || 0) + 1;

        if (doc.embedding && doc.embedding.length > 0) {
          actualDimensions = doc.embedding.length;
        }
      }

      return {
        count,
        dimensions: actualDimensions,
        categories,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error(`Failed to get stats for project ${projectId}:`, error);
      return {
        count: 0,
        dimensions: dimensions || 384,
        categories: {},
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * 清理项目集合
   */
  async cleanupCollection(projectId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Electron模式
      if (this.isElectronMode && this.ensureElectronAPI()) {
        const result = await window.electronAPI!.vector.cleanup(projectId);
        return result.success;
      }
      
      // 浏览器模式
      this.memoryCollections.delete(projectId);
      return true;
    } catch (error) {
      console.error(`Failed to cleanup collection for project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * 检查数据一致性
   */
  async checkConsistency(projectId: string): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Electron模式
      if (this.isElectronMode && this.ensureElectronAPI()) {
        const result = await window.electronAPI!.vector.checkConsistency(projectId);
        
        if (result.success && result.result) {
          return result.result;
        }
      }
      
      // 浏览器模式：内存检查
      const collection = this.getOrCreateMemoryCollection(projectId);
      const conflicts = [];
      let dimensions = 384;

      for (const doc of collection.documents.values()) {
        if (doc.embedding && doc.embedding.length > 0) {
          dimensions = doc.embedding.length;
        }
        
        if (!doc.projectId || doc.projectId !== projectId) {
          conflicts.push({
            type: 'metadata_inconsistency',
            description: `文档${doc.id}的projectId不匹配`,
            severity: 'high',
            suggestion: '修复或重新添加该文档'
          });
        }
        
        if (!doc.embedding || doc.embedding.length === 0) {
          conflicts.push({
            type: 'missing_embedding',
            description: `文档${doc.id}缺少嵌入向量`,
            severity: 'high',
            suggestion: '重新生成该文档的嵌入向量'
          });
        }
      }

      if (dimensions !== 384 && dimensions !== 1024) {
        conflicts.push({
          type: 'embedding_dimension_unusual',
          description: `嵌入维度为${dimensions}，常见值为384或1024`,
          severity: 'low',
          suggestion: '如使用非标准模型，可忽略此警告'
        });
      }

      return {
        isConsistent: conflicts.length === 0,
        conflicts,
        score: conflicts.length === 0 ? 1.0 : Math.max(0, 1 - conflicts.length * 0.1)
      };
    } catch (error) {
      console.error(`Failed to check consistency for project ${projectId}:`, error);
      return {
        isConsistent: false,
        conflicts: [{
          type: 'check_failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          severity: 'high',
          suggestion: '检查向量数据库状态'
        }],
        score: 0
      };
    }
  }
}

/**
 * 集合数据结构（浏览器内存模式）
 */
interface CollectionData {
  documents: Map<string, StoredDocument>;
  createdAt: number;
}

/**
 * 存储的文档结构
 */
interface StoredDocument {
  id: string;
  projectId: string;
  knowledgeItemId: string;
  content: string;
  embedding: number[];
  metadata: {
    category: any;
    type: string;
    size: number;
    addedAt: number;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

// 导出单例实例
export const vectorService = new VectorService();





