
import { EmbeddingService } from './embeddingService';
import { embeddingModelService } from './embeddingModelService';
import { 
  VectorDocument, 
  KnowledgeCategory,
  EmbeddingModelConfig 
} from '../types';

/**
 * API Embedding服务实现
 * 通过调用外部API（Ollama/LM Studio/云端服务）获取文本嵌入向量
 * 实现EmbeddingService接口，可与SimpleEmbeddingService互换使用
 */
export class APIEmbeddingService implements EmbeddingService {
  private isReady: boolean = false;
  private modelName: string = 'api-embedding';
  private dimensions: number = 384;
  private lastUsed: number = 0;
  private currentConfig: EmbeddingModelConfig | null = null;

  /**
   * 初始化服务
   * 检查是否有激活的Embedding模型配置
   */
  async initialize(): Promise<boolean> {
    try {
      const config = await embeddingModelService.getActiveConfig();
      
      console.log('APIEmbeddingService initialize - config:', config ? {
        id: config.id,
        name: config.name,
        provider: config.provider,
        modelName: config.modelName,
        dimensions: config.dimensions,
        testStatus: config.testStatus,
        isActive: config.isActive
      } : 'null');
      
      if (config && config.testStatus === 'success') {
        this.currentConfig = config;
        this.modelName = config.modelName;
        this.dimensions = config.dimensions;
        this.isReady = true;
        console.log(`APIEmbeddingService initialized successfully with model: ${config.modelName}, dimensions: ${config.dimensions}`);
        return true;
      }

      if (!config) {
        console.log('APIEmbeddingService: No active config found');
      } else if (config.testStatus !== 'success') {
        console.log(`APIEmbeddingService: Config test status is "${config.testStatus}", please test connection first`);
      }
      
      this.isReady = false;
      return false;
    } catch (error) {
      console.error('APIEmbeddingService initialization failed:', error);
      this.isReady = false;
      return false;
    }
  }

  /**
   * 重新加载配置
   * 在配置变更后调用
   */
  async reloadConfig(): Promise<void> {
    this.currentConfig = null;
    await this.initialize();
  }

  /**
   * 获取嵌入向量维度
   */
  getDimensions(): number {
    return this.currentConfig?.dimensions || this.dimensions;
  }

  /**
   * 为单个文本生成嵌入向量
   */
  async embedText(text: string): Promise<number[]> {
    if (!this.isReady) {
      await this.initialize();
      if (!this.isReady) {
        throw new Error('API Embedding服务未就绪，请检查配置');
      }
    }

    if (!this.currentConfig) {
      throw new Error('没有激活的Embedding模型配置');
    }

    this.lastUsed = Date.now();

    try {
      const embedding = await embeddingModelService.getEmbedding(this.currentConfig, text);
      return embedding;
    } catch (error: any) {
      console.error('embedText failed:', error);
      throw error;
    }
  }

  /**
   * 为多个文本批量生成嵌入向量
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.isReady) {
      await this.initialize();
      if (!this.isReady) {
        throw new Error('API Embedding服务未就绪，请检查配置');
      }
    }

    if (!this.currentConfig) {
      throw new Error('没有激活的Embedding模型配置');
    }

    if (texts.length === 0) {
      return [];
    }

    this.lastUsed = Date.now();

    try {
      const embeddings = await embeddingModelService.getEmbeddings(this.currentConfig, texts);
      return embeddings;
    } catch (error: any) {
      console.error('embedTexts failed:', error);
      throw error;
    }
  }

  /**
   * 为知识库文档生成向量文档
   * 实现文本分块和批量处理
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

    if (!this.currentConfig) {
      throw new Error('没有激活的Embedding模型配置');
    }

    const vectorDocuments: VectorDocument[] = [];

    // 准备所有需要处理的文本块
    const textChunks: Array<{
      itemId: string;
      text: string;
      chunkIndex: number;
      totalChunks: number;
      originalItem: typeof knowledgeItems[0];
    }> = [];

    for (const item of knowledgeItems) {
      // 如果内容太长，进行分块
      const chunks = this.chunkText(item.content, this.currentConfig.maxSequenceLength * 3); // 粗略估算字符数

      chunks.forEach((chunk, index) => {
        textChunks.push({
          itemId: item.id,
          text: chunk,
          chunkIndex: index,
          totalChunks: chunks.length,
          originalItem: item
        });
      });
    }

    if (textChunks.length === 0) {
      return [];
    }

    // 批量获取嵌入向量
    const texts = textChunks.map(c => c.text);
    const embeddings = await this.embedTexts(texts);

    // 构建VectorDocument
    textChunks.forEach((chunk, index) => {
      const embedding = embeddings[index];
      if (!embedding) {
        console.warn(`未能获取嵌入向量: ${chunk.itemId}_chunk${chunk.chunkIndex}`);
        return;
      }

      const vectorDoc: VectorDocument = {
        id: `${chunk.itemId}_chunk${chunk.chunkIndex}`,
        projectId,
        knowledgeItemId: chunk.itemId,
        content: chunk.text,
        embedding,
        metadata: {
          category: chunk.originalItem.category,
          type: chunk.originalItem.type,
          size: chunk.text.length,
          addedAt: chunk.originalItem.addedAt,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks
        }
      };

      vectorDocuments.push(vectorDoc);
    });

    console.log(`成功创建 ${vectorDocuments.length} 个向量文档（来自 ${knowledgeItems.length} 个知识库条目）`);
    return vectorDocuments;
  }

  /**
   * 将长文本分块
   * 按句子边界分割，避免截断语义
   */
  private chunkText(text: string, maxChunkSize: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    
    // 按句子边界分割（支持中英文标点）
    const sentenceDelimiters = /[.!?。！？]+/;
    const sentences = text
      .split(sentenceDelimiters)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());

    let currentChunk = '';

    for (const sentence of sentences) {
      // 尝试找到合适的标点符号添加回去
      const sentenceEnd = text.indexOf(sentence, currentChunk.length) + sentence.length;
      const punctuation = text.charAt(sentenceEnd) || '';
      const sentenceWithPunct = sentence + punctuation;

      if (currentChunk.length + sentenceWithPunct.length <= maxChunkSize) {
        currentChunk += sentenceWithPunct + ' ';
      } else {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        // 如果单个句子超过最大长度，强制截断
        if (sentenceWithPunct.length > maxChunkSize) {
          for (let i = 0; i < sentenceWithPunct.length; i += maxChunkSize) {
            chunks.push(sentenceWithPunct.slice(i, i + maxChunkSize));
          }
          currentChunk = '';
        } else {
          currentChunk = sentenceWithPunct + ' ';
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * 计算两个嵌入向量的余弦相似度
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    return embeddingModelService.calculateSimilarity(embedding1, embedding2);
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
      modelName: this.currentConfig?.modelName || this.modelName,
      dimensions: this.getDimensions(),
      lastUsed: this.lastUsed
    };
  }

  /**
   * 检查服务是否可用
   * 用于VectorIntegrationService的自动降级判断
   */
  isAvailable(): boolean {
    return this.isReady && this.currentConfig !== null;
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): EmbeddingModelConfig | null {
    return this.currentConfig;
  }
}

// 导出单例实例
export const apiEmbeddingService = new APIEmbeddingService();
