import type { KnowledgeCategory } from './knowledge';

export interface VectorDocument {
  id: string;
  projectId: string;
  knowledgeItemId: string;
  content: string;
  embedding: number[];
  metadata: {
    category: KnowledgeCategory;
    type: string;
    size: number;
    addedAt: number;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

export interface SearchResult {
  document: VectorDocument;
  score: number;
  content: string;
  metadata: {
    category: KnowledgeCategory;
    type: string;
    size: number;
    addedAt: number;
    chunkIndex?: number;
    totalChunks?: number;
    name?: string; // 可选，用于搜索结果中显示文档名称
  };
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
  filter?: Record<string, any>;
}

export interface CollectionStats {
  count: number;
  dimensions: number;
  categories: Record<string, number>;
  lastUpdated: number;
}

export interface RelevantContext {
  projectId: string;
  query: string;
  results: SearchResult[];
  summary?: string;
  timestamp: number;
}

export interface ContextOptions {
  limit?: number;
  threshold?: number;
  categories?: KnowledgeCategory[];
  includeSummary?: boolean;
}

export interface ConsistencyCheckResult {
  isConsistent: boolean;
  conflicts: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  score: number;
}

export interface HybridSearchResult extends SearchResult {
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
}

export interface HybridSearchOptions extends SearchOptions {
  semanticWeight?: number;
  keywordWeight?: number;
  useCache?: boolean;
}

// ==================== AI卡片创建命令 类型定义 ====================

// AI卡片创建命令类型
