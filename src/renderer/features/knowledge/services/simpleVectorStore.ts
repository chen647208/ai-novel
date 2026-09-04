/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */


import { logger } from '../../../shared/utils/logger';
import { type VectorDocument, type SearchResult, type SearchOptions, type CollectionStats } from '../../../../shared/types';

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
    let collection = this.collections.get(collectionName);
    if (!collection) {
      collection = new Map();
      this.collections.set(collectionName, collection);
    }
    return collection;
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

    logger.debug(`[SimpleVectorStore] Added ${documents.length} documents to project ${projectId}`);
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
      const av = a[i] ?? 0;
      const bv = b[i] ?? 0;
      dotProduct += av * bv;
      normA += av * av;
      normB += bv * bv;
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
    logger.debug(`[SimpleVectorStore] Cleaned up collection for project ${projectId}`);
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





