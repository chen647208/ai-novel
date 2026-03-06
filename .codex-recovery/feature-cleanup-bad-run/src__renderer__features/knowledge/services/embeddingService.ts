import { VectorDocument, KnowledgeCategory } from '../../../types';

/**
 * 嵌入服务接口
 */
export interface EmbeddingService {
  /**
   * 初始化嵌入服务
   */
  initialize(): Promise<boolean>;

  /**
   * 获取嵌入向量维度
   */
  getDimensions(): number;

  /**
   * 为文本生成嵌入向量
   */
  embedText(text: string): Promise<number[]>;

  /**
   * 为多个文本批量生成嵌入向量
   */
  embedTexts(texts: string[]): Promise<number[][]>;

  /**
   * 为知识库文档生成向量文档
   */
  createVectorDocuments(
    projectId: string,
    knowledgeItems: Array<{
      id: string;
      content: string;
      category: KnowledgeCategory;
      type: string;
      size: number;
      addedAt: number;
    }>
  ): Promise<VectorDocument[]>;

  /**
   * 计算文本相似度
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number;

  /**
   * 获取服务状态
   */
  getStatus(): {
    isReady: boolean;
    modelName: string;
    dimensions: number;
    lastUsed: number;
  };
}

/**
 * 简化版嵌入服务实现
 * 使用基于TF-IDF的轻量级嵌入方法
 */
export class SimpleEmbeddingService implements EmbeddingService {
  private isReady: boolean = false;
  private modelName: string = 'simple-tfidf-embedding';
  private dimensions: number = 384;
  private lastUsed: number = 0;
  private vocabulary: Map<string, number> = new Map();
  private vocabularySize: number = 0;

  constructor() {
    // 初始化词汇表
    this.initializeVocabulary();
  }

  /**
   * 初始化词汇表
   */
  private initializeVocabulary(): void {
    // 预定义一些常见词汇
    const commonWords = [
      'the', 'and', 'that', 'have', 'for', 'not', 'with', 'this', 'but', 'from',
      'they', 'will', 'what', 'there', 'their', 'about', 'would', 'these', 'them',
      'then', 'some', 'make', 'like', 'time', 'just', 'know', 'take', 'people',
      'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
      'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
      'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
      'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
      'day', 'most', 'us', 'character', 'story', 'plot', 'setting', 'theme',
      'conflict', 'resolution', 'protagonist', 'antagonist', 'dialogue',
      'description', 'narrative', 'fiction', 'novel', 'writing', 'author',
      'reader', 'chapter', 'scene', 'paragraph', 'sentence', 'word', 'phrase'
    ];

    commonWords.forEach((word, index) => {
      this.vocabulary.set(word, index);
    });
    this.vocabularySize = commonWords.length;
  }

  /**
   * 初始化嵌入服务
   */
  async initialize(): Promise<boolean> {
    try {
      this.isReady = true;
      this.lastUsed = Date.now();
      console.log('SimpleEmbeddingService initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize embedding service:', error);
      this.isReady = false;
      return false;
    }
  }

  /**
   * 获取嵌入向量维度
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * 为文本生成嵌入向量
   */
  async embedText(text: string): Promise<number[]> {
    if (!this.isReady) {
      await this.initialize();
    }

    this.lastUsed = Date.now();
    return this.createTFIDFEmbedding(text);
  }

  /**
   * 为多个文本批量生成嵌入向量
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.isReady) {
      await this.initialize();
    }

    this.lastUsed = Date.now();
    const embeddings: number[][] = [];

    for (const text of texts) {
      try {
        const embedding = this.createTFIDFEmbedding(text);
        embeddings.push(embedding);
      } catch (error) {
        console.error(`Failed to generate embedding for text: ${text.substring(0, 50)}...`);
        embeddings.push(new Array(this.dimensions).fill(0));
      }
    }

    return embeddings;
  }

  /**
   * 创建TF-IDF风格的嵌入向量
   */
  private createTFIDFEmbedding(text: string): number[] {
    // 文本预处理
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // 计算词频
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // 创建嵌入向量
    const embedding = new Array(this.dimensions).fill(0);
    
    // 使用哈希函数将单词映射到维度
    Object.entries(wordFreq).forEach(([word, freq]) => {
      // 如果单词在词汇表中，使用预定义的位置
      if (this.vocabulary.has(word)) {
        const index = this.vocabulary.get(word)! % this.dimensions;
        embedding[index] += freq / words.length;
      } else {
        // 否则使用哈希函数
        const hash = this.hashString(word);
        const index = Math.abs(hash) % this.dimensions;
        embedding[index] += freq / words.length;
      }
    });

    // 归一化
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      return embedding.map(val => val / norm);
    }

    return embedding;
  }

  /**
   * 简单的字符串哈希函数
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash;
  }

  /**
   * 为知识库文档生成向量文档
   */
  async createVectorDocuments(
    projectId: string,
    knowledgeItems: Array<{
      id: string;
      content: string;
      category: KnowledgeCategory;
      type: string;
      size: number;
      addedAt: number;
    }>
  ): Promise<VectorDocument[]> {
    if (!this.isReady) {
      await this.initialize();
    }

    const vectorDocuments: VectorDocument[] = [];
    
    // 分批处理以避免内存问题
    const batchSize = 10;
    for (let i = 0; i < knowledgeItems.length; i += batchSize) {
      const batch = knowledgeItems.slice(i, i + batchSize);
      const texts = batch.map(item => item.content);
      
      try {
        const embeddings = await this.embedTexts(texts);
        
        batch.forEach((item, index) => {
          // 如果内容太长，进行分块
          const chunks = this.chunkText(item.content, 1000);
          
          chunks.forEach((chunk, chunkIndex) => {
            const vectorDoc: VectorDocument = {
              id: `${item.id}_chunk${chunkIndex}`,
              projectId,
              knowledgeItemId: item.id,
              content: chunk,
              embedding: embeddings[index] || new Array(this.dimensions).fill(0),
              metadata: {
                category: item.category,
                type: item.type,
                size: item.size,
                addedAt: item.addedAt,
                chunkIndex,
                totalChunks: chunks.length
              }
            };
            
            vectorDocuments.push(vectorDoc);
          });
        });
      } catch (error) {
        console.error(`Failed to create vector documents for batch ${i / batchSize}:`, error);
      }
    }

    return vectorDocuments;
  }

  /**
   * 将长文本分块
   */
  private chunkText(text: string, maxChunkSize: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    for (const sentence of sentences) {
      const sentenceWithPunctuation = sentence + (text.includes(sentence + '.') ? '.' : 
                                text.includes(sentence + '!') ? '!' : 
                                text.includes(sentence + '?') ? '?' : 
                                text.includes(sentence + '。') ? '。' : 
                                text.includes(sentence + '！') ? '！' : 
                                text.includes(sentence + '？') ? '？' : '.');
      
      if (currentChunk.length + sentenceWithPunctuation.length <= maxChunkSize) {
        currentChunk += sentenceWithPunctuation + ' ';
      } else {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentenceWithPunctuation + ' ';
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * 计算文本相似度（余弦相似度）
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length || embedding1.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    isReady: boolean;
    modelName: string;
    dimensions: number;
    lastUsed: number;
  } {
    return {
      isReady: this.isReady,
      modelName: this.modelName,
      dimensions: this.dimensions,
      lastUsed: this.lastUsed
    };
  }

  /**
   * 查找最相似的文档
   */
  async findMostSimilar(
    query: string,
    documents: VectorDocument[],
    limit: number = 5
  ): Promise<Array<{ document: VectorDocument; similarity: number }>> {
    const queryEmbedding = await this.embedText(query);
    
    const similarities = await Promise.all(
      documents.map(async doc => ({
        document: doc,
        similarity: this.calculateSimilarity(queryEmbedding, doc.embedding)
      }))
    );

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * 聚类相似文档
   */
  async clusterDocuments(
    documents: VectorDocument[],
    numClusters: number = 3
  ): Promise<Array<{
    centroid: number[];
    documents: VectorDocument[];
    averageSimilarity: number;
  }>> {
    if (documents.length === 0) {
      return [];
    }

    // 简单的K-means聚类实现
    const embeddings = documents.map(doc => doc.embedding);
    const k = Math.min(numClusters, documents.length);
    
    // 随机选择初始质心
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();
    
    while (centroids.length < k) {
      const randomIndex = Math.floor(Math.random() * documents.length);
      if (!usedIndices.has(randomIndex)) {
        centroids.push([...embeddings[randomIndex]]);
        usedIndices.add(randomIndex);
      }
    }

    let clusters: Array<VectorDocument[]> = Array(k).fill(null).map(() => []);
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;

    while (changed && iterations < maxIterations) {
      // 分配文档到最近的质心
      const newClusters: Array<VectorDocument[]> = Array(k).fill(null).map(() => []);
      
      documents.forEach((doc, docIndex) => {
        let minDistance = Infinity;
        let closestCluster = 0;
        
        centroids.forEach((centroid, centroidIndex) => {
          const distance = 1 - this.calculateSimilarity(doc.embedding, centroid);
          if (distance < minDistance) {
            minDistance = distance;
            closestCluster = centroidIndex;
          }
        });
        
        newClusters[closestCluster].push(doc);
      });

      // 更新质心
      changed = false;
      for (let i = 0; i < k; i++) {
        if (newClusters[i].length > 0) {
          const newCentroid = this.calculateCentroid(newClusters[i].map(d => d.embedding));
          
          // 检查质心是否变化
          const oldSimilarity = this.calculateSimilarity(centroids[i], newCentroid);
          if (oldSimilarity < 0.99) {
            changed = true;
            centroids[i] = newCentroid;
          }
        }
      }
      
      clusters = newClusters;
      iterations++;
    }

    // 计算每个聚类的平均相似度
    return clusters.map((clusterDocs, index) => {
      if (clusterDocs.length === 0) {
        return {
          centroid: centroids[index],
          documents: [],
          averageSimilarity: 0
        };
      }

      let totalSimilarity = 0;
      let count = 0;
      
      for (let i = 0; i < clusterDocs.length; i++) {
        for (let j = i + 1; j < clusterDocs.length; j++) {
          totalSimilarity += this.calculateSimilarity(
            clusterDocs[i].embedding,
            clusterDocs[j].embedding
          );
          count++;
        }
      }

      const averageSimilarity = count > 0 ? totalSimilarity / count : 0;

      return {
        centroid: centroids[index],
        documents: clusterDocs,
        averageSimilarity
      };
    });
  }

  /**
   * 计算质心
   */
  private calculateCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      return new Array(this.dimensions).fill(0);
    }

    const centroid = new Array(this.dimensions).fill(0);
    
    embeddings.forEach(embedding => {
      embedding.forEach((value, index) => {
        centroid[index] += value;
      });
    });

    // 归一化
    const norm = Math.sqrt(centroid.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      return centroid.map(val => val / norm);
    }

    return centroid;
  }

  /**
   * 扩展词汇表
   */
  extendVocabulary(words: string[]): void {
    words.forEach(word => {
      if (!this.vocabulary.has(word)) {
        this.vocabulary.set(word, this.vocabularySize);
        this.vocabularySize++;
      }
    });
  }

  /**
   * 获取词汇表大小
   */
  getVocabularySize(): number {
    return this.vocabularySize;
  }
}

// 导出单例实例
export const embeddingService = new SimpleEmbeddingService();

