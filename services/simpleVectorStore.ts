
import { VectorDocument, SearchResult, SearchOptions, CollectionStats } from '../types';

/**
 * 简单内存向量存储服务
 * 使用纯 JavaScript Map 实现，无需 ChromaDB 服务器
 * 适合 Electron 桌面应用
 */
export class SimpleVectorStore {
  private collections: Map<string, Map<string, VectorDocument>> = new Map();
  private isInitialized: boolean = true; // 始终已初始化

  /**
   * 获取或创建项目集合
   */
  private getCollection(projectId: string): Map<string, VectorDocument> {
    const collectionName = `project_${projectId}`;
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, new Map());
    }
    return this.collections.get(collectionName)!;
  }

  /**
   * 添加文档到向量存储
   */
  async addDocuments(projectId: string, documents: VectorDocument[]): Promise<string[]> {
    const collection = this.getCollection(projectId);
    const ids: string[] = [];

    for (const doc of documents) {
      collection.set(doc.id, doc);
      ids.push(doc.id);
    }

    console.log(`[SimpleVectorStore] Added ${documents.length} documents to project ${projectId}`);
    return ids;
  }

  /**
   * 语义搜索 - 使用余弦相似度
   */
  async semanticSearch(
    projectId: string,
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const collection = this.getCollection(projectId);
    const limit = options.limit || 10;
    const threshold = options.threshold || 0;

    const results: Array<{ doc: VectorDocument; score: number }> = [];

    for (const doc of collection.values()) {
      // 计算余弦相似度
      const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
      
      if (score >= threshold) {
        results.push({ doc, score });
      }
    }

    // 按相似度排序
    results.sort((a, b) => b.score - a.score);

    // 返回前 N 个结果
    return results.slice(0, limit).map(({ doc, score }) => ({
      document: doc,
      score,
      content: doc.content,
      metadata: doc.metadata
    }));
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.warn('Vector dimensions do not match:', a.length, 'vs', b.length);
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

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 获取集合统计信息
   */
  async getCollectionStats(projectId: string): Promise<CollectionStats> {
    const collection = this.getCollection(projectId);
    const count = collection.size;

    // 计算维度（从第一个文档获取）
    let dimensions = 384; // 默认值
    const firstDoc = collection.values().next().value;
    if (firstDoc && firstDoc.embedding) {
      dimensions = firstDoc.embedding.length;
    }

    // 统计分类
    const categories: Record<string, number> = {};
    for (const doc of collection.values()) {
      const category = doc.metadata?.category || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
    }

    return {
      count,
      dimensions,
      categories,
      lastUpdated: Date.now()
    };
  }

  /**
   * 删除项目集合
   */
  async cleanupCollection(projectId: string): Promise<boolean> {
    const collectionName = `project_${projectId}`;
    this.collections.delete(collectionName);
    console.log(`[SimpleVectorStore] Cleaned up collection for project ${projectId}`);
    return true;
  }

  /**
   * 删除指定文档
   */
  async deleteDocuments(projectId: string, ids: string[]): Promise<boolean> {
    const collection = this.getCollection(projectId);
    for (const id of ids) {
      collection.delete(id);
    }
    return true;
  }

  /**
   * 获取服务状态
   */
  getStatus(): { isInitialized: boolean; collections: number } {
    return {
      isInitialized: this.isInitialized,
      collections: this.collections.size
    };
  }
}

// 导出单例实例
export const simpleVectorStore = new SimpleVectorStore();
