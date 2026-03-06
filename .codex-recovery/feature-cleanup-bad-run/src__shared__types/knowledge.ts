export type KnowledgeCategory = 'inspiration' | 'character' | 'outline' | 'chapter' | 'writing';

export interface KnowledgeItem {
  id: string;
  name: string;
  content: string;
  type: string;
  size: number;
  addedAt: number;
  category: KnowledgeCategory;
}

export interface PromptTemplate {
  id: string;
  category: 'inspiration' | 'character' | 'outline' | 'chapter' | 'edit' | 'writing' | 'summary';
  name: string;
  content: string;
}

// ========== AI卡片提示词模板类型 (Phase 3 Integration) ==========

/**
 * AI卡片提示词模板分类
 */
export type CardPromptCategory = 
  | 'card-character'   // 角色卡片
  | 'card-location'    // 地点卡片
  | 'card-faction'     // 势力卡片
  | 'card-timeline'    // 时间线事件
  | 'card-rule'        // 规则系统
  | 'card-magic'       // 魔法体系
  | 'card-tech'        // 科技水平
  | 'card-history';    // 历史背景

/**
 * AI卡片提示词模板
 * 用于自定义AI卡片创建时的提示词
 */
export interface CardPromptTemplate {
  id: string;
  /** 模板分类 */
  category: CardPromptCategory;
  /** 模板名称 */
  name: string;
  /** 提示词内容 */
  content: string;
  /** 可用变量列表 */
  variables: string[];
  /** 是否为系统默认模板 */
  isDefault: boolean;
  /** 模板效果预览示例 */
  previewExample?: string;
  /** 必须要求AI返回的字段列表 */
  requiredFields: string[];
  /** 各字段的说明 */
  fieldDescriptions: Record<string, string>;
}

// ========== 一致性检查相关类型 (Phase 5) ==========

/**
 * 一致性检查模式
 */
export type ConsistencyCheckMode = 
  | 'rule'      // 结构化规则检查（原有）
  | 'ai'        // AI语义检查
  | 'vector'    // RAG向量相似度
  | 'hybrid';   // 混合模式（全部启用）

/**
 * 一致性检查提示词分类
 */
export type ConsistencyCheckPromptCategory = 
  | 'semantic_character'    // 角色语义检查
  | 'semantic_faction'      // 势力语义检查
  | 'semantic_location'     // 地点语义检查
  | 'semantic_timeline'     // 时间线逻辑检查
  | 'semantic_cross'        // 跨引用一致性检查
  | 'similarity_detection'; // 相似度检测提示词

/**
 * 一致性检查提示词模板
 */
export interface ConsistencyCheckPromptTemplate {
  id: string;
  category: ConsistencyCheckPromptCategory;
  name: string;
  content: string;
  description?: string;
  isDefault?: boolean;
  variables: string[];
  tags?: string[];
  applicableModes: ('ai' | 'vector')[];
}

/**
 * 一致性检查配置
 */
export interface ConsistencyCheckConfig {
  mode: ConsistencyCheckMode;
  weights: {
    rule: number;
    ai: number;
    vector: number;
  };
  selectedPromptTemplates: {
    semantic_character?: string;
    semantic_faction?: string;
    semantic_location?: string;
    semantic_timeline?: string;
    semantic_cross?: string;
    similarity_detection?: string;
  };
  aiConfig?: {
    enabled: boolean;
    temperature: number;
    maxTokens: number;
  };
  vectorConfig?: {
    enabled: boolean;
    similarityThreshold: number;
    maxResults: number;
  };
}

// ========== 世界观设定相关类型 (Phase 1) ==========

/**
 * 世界观设定 - 包含魔法体系、科技水平、历史背景
 */
