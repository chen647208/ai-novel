/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */


export type ModelProvider = 'openai-chat' | 'openai-responses' | 'anthropic' | 'gemini' | 'ollama';

// Embedding模型提供商类型
export type EmbeddingModelProvider = 'ollama' | 'lmstudio' | 'siliconflow' | 'bailian' | 'volcano' | 'openai-compatible';

// 输出模式类型
export type OutputMode = 'streaming' | 'traditional';

/** 界面语言。新增语言时在此扩展联合，并补一份对应字典。 */
export type AppLanguage = 'zh' | 'en';

/** 界面主题：浅色 / 深色 / 跟随系统。 */
export type AppTheme = 'light' | 'dark' | 'system';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  /** 渠道预设 id：官方（deepseek/kimi/…）与自定义兼容协议（custom-openai/…）通用，决定下拉选中与官方性判定 */
  presetId?: string;
  /** 是否在选择器/生成流程中启用。缺省视为启用，保证老数据兼容。 */
  isEnabled?: boolean;
  endpoint?: string;
  apiKey?: string;
  modelName: string;
  
  // AI模型参数配置（新增可选字段）
  temperature?: number;      // 温度控制：0.0-2.0，默认0.7
  maxTokens?: number;       // 最大输出令牌数，默认由模型决定
  systemPrompt?: string;    // 系统提示词，用于指导模型行为
  
  // 流式支持标志
  supportsStreaming?: boolean;
  
  // 默认输出模式（新增）
  defaultOutputMode?: OutputMode;
  
  // 模型列表自动获取相关字段
  availableModels?: string[];          // 可用的模型列表
  modelsLastFetched?: number;          // 上次获取模型列表的时间戳
  modelsFetchError?: string;           // 获取模型列表时的错误信息
  isFetchingModels?: boolean;          // 是否正在获取模型列表
}

// AI响应类型
export interface AIResponse {
  content: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
    /** 缓存命中读入（Anthropic 网关透出；无缓存则缺席） */
    cacheRead?: number;
    /** 缓存写入 */
    cacheWrite?: number;
  };
  model?: string;
  finishReason?: string;
  error?: string;
  /** 非致命提示（如流式降级为传统模式），内容仍有效，不应视为失败 */
  notice?: string;
  metadata?: {
    prompt?: string;           // 原始提示词
    modelConfig?: ModelConfig; // 使用的模型配置
    [key: string]: unknown; // 其他元数据
  };
}

// AI生成历史记录类型
export interface AIHistoryRecord {
  id: string;
  chapterId: string;           // 关联的章节ID
  timestamp: number;           // 生成时间戳
  prompt: string;              // 使用的提示词
  generatedContent: string;    // 生成的内容
  modelConfig: {
    modelName: string;         // 模型名称
    provider: ModelProvider;   // 模型提供商
    temperature?: number;      // 温度参数
    maxTokens?: number;        // 最大令牌数
  };
  tokens?: {
    prompt: number;            // 提示词令牌数
    completion: number;        // 生成内容令牌数
    total: number;             // 总令牌数
  };
  metadata?: {
    templateName?: string;     // 使用的模板名称
    batchGeneration?: boolean; // 是否为批量生成
    chapterTitle?: string;     // 章节标题
    generatedChapterCount?: number; // 生成的章节数量（仅用于章节细纲生成）
    operationType?: string;    // 操作类型：'summary_extraction'等
  };
}

export interface StreamingAIResponse extends AIResponse {
  isComplete: boolean;
  isStreaming?: boolean;
}

// 流式回调类型
export type StreamingCallback = (response: StreamingAIResponse) => void;

/** AI 网关调用选项（跨 IPC 的线上版本）。AbortSignal 不跨进程：取消经 requestId 走 abort 通道。 */
export interface AiCallOptions {
  /** 瞬时失败（网络/429/5xx）的额外重试次数，默认 2 */
  retries?: number;
}

/** AI 网关流式事件（ai:stream:event 通道载荷，按 requestId 多路分发）。
 * delta.content 为累计值；done 携带最终完整块（含 tokens/finishReason/error/notice）。 */
export type AiStreamEvent =
  | { t: 'delta'; requestId: string; accumulated: string; model?: string; tokens?: AIResponse['tokens'] }
  | { t: 'done'; requestId: string; response: StreamingAIResponse }
  | { t: 'error'; requestId: string; error: string };

export interface Character {
  id: string;
  name: string;
  gender: string;          // 新增：性别
  age: string;
  role: string; // 角色类型（主角、反派、配角等）
  personality: string;
  background: string;
  relationships: string;
  
  // 新增字段
  appearance: string;      // 外观描述：身高、体型、发色、眼睛颜色等
  distinctiveFeatures: string; // 标志性特征：特别的标记或饰品
  occupation: string;      // 职业/身份
  motivation: string;      // 动机/目标
  strengths: string;       // 优势/能力
  weaknesses: string;      // 弱点/缺陷
  characterArc: string;    // 角色成长弧线
  
  // Phase 3: 出生信息（用于年龄计算）
  birthInfo?: CharacterBirthInfo;
  
  // ===== 世界观关联字段（Phase 1 Integration）=====
  /** 所属势力ID */
  factionId?: string;
  /** 出身地点ID */
  homeLocationId?: string;
  /** 当前所在地点ID */
  currentLocationId?: string;
  /** 等级体系中的位置 */
  ruleSystemLevel?: {
    /** 规则系统ID */
    systemId: string;
    /** 等级名称 */
    levelName: string;
  };
  /** 出生日期（用于年龄计算） */
  birthDate?: HistoryDate;
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  content: string;
  contentSummary?: string; // 章节正文摘要（从正文中提取）
  order: number;
  history?: AIHistoryRecord[]; // AI生成历史记录
  snapshots?: ChapterSnapshot[]; // 手动编辑快照（用于误删/回退恢复）
  
  // ===== 世界观关联字段（Phase 1 Integration）=====
  /** 主要发生地点ID */
  mainLocationId?: string;
  /** 涉及势力ID列表 */
  involvedFactionIds?: string[];
  /** 关联时间线事件ID */
  timelineEventId?: string;
  /** 故事内时间点 */
  storyDate?: HistoryDate;
}

/** 章节正文快照：记录某一时刻的完整内容，可一键回退 */
export interface ChapterSnapshot {
  id: string;
  content: string;
  timestamp: number;
  charCount: number;
  /** 快照来源：自动定时 / 手动 / 清空前 */
  source: 'auto' | 'manual' | 'before-clear';
}

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
  /** 内置默认模板的显示名 i18n 键（如 'prompts:p2'）；用户改名后清除，渲染时优先于 name */
  nameKey?: string;
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
  /** 内置默认模板的显示名 i18n 键（如 'cards:defaultNames.character'），渲染时优先于 name */
  nameKey?: string;
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
  /** 内置默认模板的显示名 i18n 键（如 'consistency:defaultNames.character'），渲染时优先于 name */
  nameKey?: string;
  content: string;
  description?: string;
  /** 内置默认模板的描述 i18n 键（如 'consistency:defaultDescs.character'），渲染时优先于 description */
  descriptionKey?: string;
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
export interface WorldView {
  id: string;
  projectId: string;
  /** 魔法体系设定 */
  magicSystem?: MagicSystem;
  /** 科技水平设定 */
  technologyLevel?: TechnologyLevel;
  /** 历史背景设定 */
  history?: WorldHistory;
  createdAt: number;
  updatedAt: number;
}

/**
 * 魔法体系
 */
export interface MagicSystem {
  /** 体系名称（如：灵力体系、魔法体系、斗气体系） */
  name: string;
  /** 体系概述 */
  description: string;
  /** 魔法/能量规则 */
  rules: string[];
  /** 等级/境界划分（可选） */
  levels?: MagicLevel[];
  /** 限制条件（如：魔力消耗、施法材料、副作用） */
  limitations: string;
  /** 施法方式（如：咒语、手势、意念） */
  castingMethod?: string;
}

/**
 * 魔法/修炼等级
 */
export interface MagicLevel {
  /** 等级名称（如：炼气期、魔法师） */
  name: string;
  /** 等级描述 */
  description: string;
  /** 晋升条件 */
  requirements?: string;
  /** 等级能力 */
  abilities?: string;
  /** 排序索引（用于显示顺序） */
  order: number;
}

/**
 * 科技水平
 */
export interface TechnologyLevel {
  /** 时代名称（如：蒸汽时代、赛博朋克、星际时代） */
  era: string;
  /** 科技水平描述 */
  description: string;
  /** 关键技术列表 */
  keyTechnologies: string[];
  /** 技术限制（如：无法突破光速、能源枯竭） */
  limitations: string;
  /** 能源类型（如：蒸汽、核能、灵石） */
  energySource?: string;
  /** 交通方式 */
  transportation?: string;
  /** 通讯方式 */
  communication?: string;
}

/**
 * 世界历史
 */
export interface WorldHistory {
  /** 历史概述 */
  overview: string;
  /** 历法系统（如：公元、纪元、XX历） */
  calendarSystem?: string;
  /** 关键历史事件 */
  keyEvents: HistoryEvent[];
}

/**
 * 历史事件
 */
export interface HistoryEvent {
  id: string;
  /** 事件日期（支持各种历法格式，如"第三纪元45年春季"） */
  date: HistoryDate;
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 事件影响（对当前故事的影响） */
  impact?: string;
  /** 关联角色ID列表 */
  relatedCharacterIds?: string[];
  /** 关联储备ID列表 */
  relatedLocationIds?: string[];
}

/**
 * 历史日期 - 支持灵活的时间表示
 */
export interface HistoryDate {
  /** 年（相对于历法起点） */
  year: number;
  /** 月（可选） */
  month?: number;
  /** 日（可选） */
  day?: number;
  /** 显示格式（如"第三纪元春季"） */
  display?: string;
  /** 是否是虚构历法 */
  isFictional?: boolean;
}

// ========== Phase 3: 时间线 ==========

/**
 * 时间线
 */
export interface Timeline {
  id: string;
  projectId: string;
  /** 时间线配置 */
  config: {
    /** 历法系统（如：公元、纪元、XX历） */
    calendarSystem: string;
    /** 起始年份（用于计算） */
    startYear?: number;
    /** 时间线名称 */
    name?: string;
  };
  /** 时间线事件 */
  events: TimelineEvent[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 时间线事件
 */
export interface TimelineEvent {
  id: string;
  /** 事件日期 */
  date: HistoryDate;
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 事件类型 */
  type: 'plot' | 'character' | 'world' | 'faction' | 'battle' | 'discovery' | 'other';
  /** 事件影响 */
  impact?: string;
  /** 关联角色ID列表 */
  relatedCharacterIds?: string[];
  /** 关联地点ID列表 */
  relatedLocationIds?: string[];
  /** 关联势力ID列表 */
  relatedFactionIds?: string[];
  /** 关联章节ID */
  relatedChapterId?: string;
  /** 事件顺序（用于排序） */
  order?: number;
}

/**
 * 角色出生信息（用于年龄计算）
 */
export interface CharacterBirthInfo {
  /** 出生日期 */
  date?: HistoryDate;
  /** 年龄计算方式 */
  calculationType: 'manual' | 'auto';
  /** 手动设置的当前年龄（当calculationType为manual时使用） */
  currentAge?: string;
  /** 当前故事时间点（用于自动计算年龄） */
  storyCurrentDate?: HistoryDate;
}

// ========== Phase 2: 地理信息与势力 ==========

/**
 * 地点/场景
 */
export interface Location {
  id: string;
  projectId: string;
  /** 地点名称 */
  name: string;
  /** 地点类型 */
  type: 'city' | 'region' | 'building' | 'landmark' | 'dungeon' | 'wilderness' | 'other';
  /** 地点描述 */
  description: string;
  /** 地理属性 */
  geography?: {
    /** 地形（如：平原、山脉、森林、沙漠） */
    terrain: string;
    /** 气候 */
    climate: string;
    /** 资源 */
    resources?: string[];
  };
  /** 地点特征标签 */
  tags?: string[];
  /** 势力控制 */
  controlledBy?: string; // Faction.id
  /** 关联地点（地理连接） */
  connectedLocations?: Array<{
    locationId: string;
    relation: 'adjacent' | 'trade' | 'conflict' | 'ally' | 'subordinate';
    description?: string;
  }>;
  /** 地图位置（用于可视化） */
  mapPosition?: {
    x: number;
    y: number;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * 势力/派系
 */
export interface Faction {
  id: string;
  projectId: string;
  /** 势力名称 */
  name: string;
  /** 势力类型 */
  type: 'kingdom' | 'empire' | 'sect' | 'guild' | 'family' | 'tribe' | 'organization' | 'alliance' | 'other';
  /** 势力描述 */
  description: string;
  /** 理念/信仰 */
  ideology?: string;
  /** 实力评估 */
  strength?: {
    military?: string;    // 军事实力
    economic?: string;    // 经济实力
    influence?: string;   // 影响力
    overall: string;      // 综合评估
  };
  /** 标志/旗帜描述 */
  emblem?: string;
  /** 势力关系网 */
  relations?: Array<{
    factionId: string;
    type: 'ally' | 'enemy' | 'neutral' | 'vassal' | 'suzerain' | 'rival' | 'trade';
    description?: string;
  }>;
  /** 控制地点ID列表 */
  controlledLocationIds?: string[]; // Location.id[]
  /** 成员角色ID列表 */
  memberCharacterIds?: string[]; // Character.id[]
  /** 势力领袖 */
  leaderId?: string; // Character.id
  /** 创立时间 */
  foundedDate?: string;
  createdAt: number;
  updatedAt: number;
  
  // ===== 强化关联字段（Phase 1 Integration）=====
  /** 总部地点ID */
  headquartersLocationId?: string;
  /** 领地/控制地域ID列表 */
  territoryLocationIds?: string[];
}

// ========== Phase 4: 规则系统 ==========

/**
 * 规则系统类型
 */
export type RuleSystemType = 
  | 'cultivation'    // 修炼体系
  | 'magic'          // 魔法等级
  | 'tech'           // 科技等级
  | 'currency'       // 货币体系
  | 'organization'   // 组织制度
  | 'profession'     // 职业体系
  | 'title'          // 称号/爵位
  | 'custom';        // 自定义

/**
 * 规则系统
 */
export interface RuleSystem {
  id: string;
  projectId: string;
  /** 规则类型 */
  type: RuleSystemType;
  /** 系统名称 */
  name: string;
  /** 系统描述 */
  description: string;
  /** 等级/层次定义 */
  levels: RuleLevel[];
  /** 适用角色ID列表 */
  appliedToCharacterIds?: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 规则等级
 */
export interface RuleLevel {
  /** 等级名称 */
  name: string;
  /** 等级描述 */
  description: string;
  /** 等级序号（用于排序） */
  order: number;
  /** 晋升条件 */
  requirements?: string;
  /** 等级能力/特权 */
  abilities?: string;
  /** 等级标识（颜色/图标等） */
  badge?: string;
}

// ========== 伏笔追踪数据模型 ==========

export type ForeshadowStatus = 'planted' | 'paid-off' | 'abandoned';
export type ForeshadowImportance = 'minor' | 'major' | 'critical';

/** 一条伏笔：从埋设到回收的完整生命周期 */
export interface Foreshadow {
  id: string;
  title: string;                 // 伏笔简述（一句话）
  detail: string;                // 具体内容与预期回收方式
  status: ForeshadowStatus;
  importance: ForeshadowImportance;
  plantedChapterId?: string;     // 埋设章节
  plantedChapterOrder?: number;  // 埋设章节序号（用于排序/超期判断）
  payoffChapterId?: string;      // 回收章节
  payoffChapterOrder?: number;
  tags: string[];                // 关联人物/地点/线索标签
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ========== 项目数据模型 ==========

export interface Project {
  id: string;
  title: string;
  inspiration: string;
  intro: string;
  characters: Character[];
  outline: string;
  chapters: Chapter[];
  virtualChapters: Chapter[]; // 新增：独立的虚拟章节存储
  knowledge: KnowledgeItem[]; // 知识库字段
  lastModified: number;
  // ===== Phase 1: 世界观设定（可选） =====
  worldView?: WorldView;
  // ===== Phase 2: 地理信息与势力（可选） =====
  locations?: Location[];
  factions?: Faction[];
  // ===== Phase 3: 时间线（可选） =====
  timeline?: Timeline;
  // ===== Phase 4: 规则系统（可选） =====
  ruleSystems?: RuleSystem[];
  // ===== 伏笔追踪 =====
  foreshadows?: Foreshadow[];
}

/** 自定义字体元数据（字形文件另存用户数据目录 fonts/ 下，不进状态 JSON）。 */
export interface CustomFontMeta {
  id: string;
  /** 展示名（也是 @font-face 家族名） */
  name: string;
  fileName: string;
  format: 'ttf' | 'otf' | 'woff' | 'woff2';
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  models: ModelConfig[];
  prompts: PromptTemplate[];
  activeModelId: string | null;
  // Embedding模型配置
  embeddingModels: EmbeddingModelConfig[];
  activeEmbeddingModelId: string | null;
  // AI卡片提示词模板
  cardPrompts?: CardPromptTemplate[];
  // 一致性检查提示词模板
  consistencyPrompts?: ConsistencyCheckPromptTemplate[];
  // 一致性检查配置
  consistencyCheckConfig?: ConsistencyCheckConfig;
  /** 界面语言；undefined 表示跟随系统检测（首启按 navigator 决定，之后持久化用户选择） */
  language?: AppLanguage;
  /** 界面主题；undefined 表示默认浅色（首启），之后持久化用户选择 */
  theme?: AppTheme;
  /** 界面字体预设 id（system 表系统默认）；undefined 表跟随系统 */
  uiFont?: string;
  /** 正文/编辑字体预设 id 或 custom:<id>；undefined 表默认宋体栈 */
  editorFont?: string;
  /** 用户导入的自定义字体（仅元数据） */
  customFonts?: CustomFontMeta[];
}

// 向量数据库相关类型
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
  filter?: Record<string, unknown>;
}

export interface CollectionStats {
  count: number;
  dimensions: number;
  categories: Record<string, number>;
  lastUpdated: number;
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
export type AICardCommand = 
  | 'character'  // /角色
  | 'location'   // /地点
  | 'faction'    // /势力
  | 'timeline'   // /时间线
  | 'rule'       // /规则
  | 'event'      // /事件
  | 'magic'      // /魔法体系
  | 'tech'       // /科技水平
  | 'history';   // /历史背景

// 命令解析结果
export interface AICardCommandResult {
  command: AICardCommand;
  rawInput: string;      // 用户原始输入
  description: string;   // 提取的描述文本
}

// 项目上下文（用于构建Prompt）
export interface AIProjectContext {
  title?: string;
  worldView?: WorldView;
  characters?: Character[];
  locations?: Location[];
  factions?: Faction[];
  timeline?: Timeline;
  ruleSystems?: RuleSystem[];
}

// 卡片创建结果
export type CreatedCard =
  | Character
  | Location
  | Faction
  | TimelineEvent
  | RuleSystem
  | MagicSystem
  | TechnologyLevel
  | WorldHistory;

export interface CardCreationResult {
  success: boolean;
  command: AICardCommand;
  data: CreatedCard | null; // 创建的卡片数据
  message: string;        // 用户提示信息
}

// ==================== Phase 5: 可视化扩展 类型定义 ====================

// 图谱类型
export type DiagramType = 
  | 'character'           // 角色关系图
  | 'faction'            // 势力关系图
  | 'location'           // 地点关联图
  | 'timeline'           // 时间线图
  | 'worldview'          // 世界观网络
  | 'mixed';             // 综合视图

// 布局类型
export type GraphLayout = 'force' | 'hierarchical' | 'circular' | 'timeline' | 'map';

// 可视化节点类型
export type GraphNodeType = 'character' | 'faction' | 'location' | 'event' | 'rule' | 'worldview';

// 可视化配置
export interface VisualizationConfig {
  type: DiagramType;
  layout?: GraphLayout;
  filters?: {
    showCharacters?: boolean;
    showFactions?: boolean;
    showLocations?: boolean;
    showEvents?: boolean;
    showRules?: boolean;
  };
  // 视图特定配置
  viewOptions?: {
    showLabels?: boolean;
    showRelationships?: boolean;
    clusterByFaction?: boolean;      // 按势力分组
    clusterByLocation?: boolean;     // 按地点分组
    highlightMainCharacters?: boolean; // 高亮主角
  };
}

// 图谱节点数据
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  name: string;
  description?: string;
  // 位置（用于可拖拽）
  x?: number;
  y?: number;
  // 样式
  color?: string;
  size?: number;
  icon?: string;
  // 关联数据
  data?: Character | Faction | Location | TimelineEvent | RuleSystem;
}

// 图谱连线数据
export interface GraphLink {
  id: string;
  source: string;      // 源节点ID
  target: string;      // 目标节点ID
  type: 'relationship' | 'belongs' | 'located' | 'event' | 'rule' | 'custom';
  label?: string;      // 连线标签
  strength?: number;   // 连线强度 (0-1)
  color?: string;
  dashed?: boolean;
}

// 图谱数据集
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// 节点选中事件
export interface NodeSelection {
  node: GraphNode;
  relatedNodes: string[];    // 相关节点ID列表
  relatedLinks: string[];    // 相关连线ID列表
}

// 存储配置接口
export interface StorageConfig {
  dataPath: string;           // 数据存储路径
  useCustomPath: boolean;     // 是否使用自定义路径
  lastMigration?: string;     // 上次数据迁移时间
  // 新增自动备份配置
  autoBackupEnabled?: boolean;      // 是否启用自动备份
  autoBackupInterval?: number;      // 自动备份间隔（秒）：5, 10, 30
  lastAutoBackup?: number;          // 上次自动备份时间戳
  maxBackupFiles?: number;          // 最大备份文件数（默认为1，覆盖备份）
}

// Electron API 类型定义（与 src/main/preload.ts 暴露的能力一一对应）
export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface VectorDocumentPayload {
  id: string;
  projectId: string;
  knowledgeItemId?: string;
  content: string;
  embedding: number[];
  metadata?: {
    category?: string;
    type?: string;
    size?: number;
    addedAt?: number;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

export interface VectorSearchResultItem {
  document: VectorDocumentPayload & { embedding: number[] };
  score: number;
  content: string;
  metadata: {
    category: string;
    type: string;
    size: number;
    addedAt: number;
    chunkIndex?: number;
    totalChunks?: number;
    name: string;
  };
}

export interface VectorStats {
  count: number;
  dimensions: number;
  categories: Record<string, number>;
  lastUpdated: number;
}

export interface VectorConsistencyResult {
  isConsistent: boolean;
  conflicts: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high'; suggestion: string }>;
  score: number;
}

export interface ElectronAPI {
  // 文件系统操作
  getAppDataPath: () => Promise<string>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<boolean>;
  exists: (filePath: string) => Promise<boolean>;
  unlink: (filePath: string) => Promise<boolean>;

  // 对话框
  openFileDialog: (options: FileDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>;
  saveFileDialog: (options: SaveDialogOptions) => Promise<{ canceled: boolean; filePath?: string }>;
  openDirectoryDialog: (options: FileDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>;
  listDirectory: (dirPath: string) => Promise<Array<{ name: string; type: 'file' | 'directory' }>>;

  // 向量存储操作（通过主进程代理）
  vector: {
    initialize: () => Promise<{ success: boolean; error?: string }>;
    addDocuments: (projectId: string, documents: VectorDocumentPayload[]) => Promise<{ success: boolean; ids?: string[]; error?: string }>;
    updateDocument: (projectId: string, document: VectorDocumentPayload) => Promise<{ success: boolean; error?: string }>;
    deleteDocuments: (projectId: string, documentIds: string[]) => Promise<{ success: boolean; error?: string }>;
    semanticSearch: (projectId: string, queryEmbedding: number[], options?: { limit?: number }) => Promise<{ success: boolean; results?: VectorSearchResultItem[]; error?: string }>;
    getStats: (projectId: string) => Promise<{ success: boolean; stats?: VectorStats; error?: string }>;
    cleanup: (projectId: string) => Promise<{ success: boolean; error?: string }>;
    checkConsistency: (projectId: string) => Promise<{ success: boolean; result?: VectorConsistencyResult; error?: string }>;
  };

  // SQLite 数据引擎（主进程托管 node:sqlite）。值一律走 params 绑定。
  db: {
    exec: (sql: string) => Promise<void>;
    run: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number }>;
    all: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
    get: (sql: string, params?: unknown[]) => Promise<Record<string, unknown> | undefined>;
  };

  // AI 网关（适配器在主进程执行；流式经 ai:stream:event 按 requestId 推送）
  aiGateway: {
    complete: (requestId: string, model: ModelConfig, prompt: string, options?: AiCallOptions) => Promise<AIResponse>;
    openStream: (requestId: string, model: ModelConfig, prompt: string, options?: AiCallOptions) => Promise<boolean>;
    abort: (requestId: string) => Promise<boolean>;
    onStreamEvent: (listener: (event: AiStreamEvent) => void) => () => void;
  };

  // 安全密钥库（safeStorage/OS 钥匙串；渲染端持久化只存 vault: 引用）
  vault: {
    isAvailable: () => Promise<boolean>;
    set: (id: string, plaintext: string) => Promise<boolean>;
    get: (id: string) => Promise<string | null>;
    remove: (id: string) => Promise<boolean>;
  };
}

// Embedding模型配置接口
export interface EmbeddingModelConfig {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 提供商类型 */
  provider: EmbeddingModelProvider;
  /** API端点地址 */
  endpoint: string;
  /** API密钥（本地部署可为空） */
  apiKey?: string;
  /** 模型名称 */
  modelName: string;
  /** 向量维度 */
  dimensions: number;
  /** 最大序列长度 */
  maxSequenceLength: number;
  /** 批处理大小 */
  batchSize: number;
  /** 请求超时（毫秒） */
  timeout: number;
  /** 是否归一化向量 */
  normalizeEmbeddings: boolean;
  /** 池化策略 */
  poolingStrategy: 'mean' | 'cls' | 'max';
  /** 截断策略 */
  truncate: 'start' | 'end' | 'none';
  /** 是否为当前激活配置 */
  isActive: boolean;
  /** 上次测试时间 */
  lastTested?: number;
  /** 测试状态 */
  testStatus?: 'success' | 'failed' | 'untested';
  /** 可用模型列表（缓存） */
  availableModels?: string[];
  /** 上次获取模型列表时间 */
  modelsLastFetched?: number;
  /** 测试失败错误信息 */
  testError?: string;
}

/** 连接测试结果 */
export interface EmbeddingConnectionTestResult {
  success: boolean;
  dimensions: number;
  latency: number;
  error?: string;
  modelName?: string;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
