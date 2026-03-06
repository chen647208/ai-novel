export type ModelProvider = 'gemini' | 'ollama' | 'openai-compatible';

// Embedding模型提供商类型
export type EmbeddingModelProvider = 'ollama' | 'lmstudio' | 'siliconflow' | 'bailian' | 'volcano' | 'openai-compatible';

// 输出模式类型
export type OutputMode = 'streaming' | 'traditional';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
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
  };
  model?: string;
  finishReason?: string;
  error?: string;
  metadata?: {
    prompt?: string;           // 原始提示词
    modelConfig?: ModelConfig; // 使用的模型配置
    [key: string]: any;        // 其他元数据
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
