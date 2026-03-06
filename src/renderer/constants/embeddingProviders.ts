
import { EmbeddingModelProvider } from '../types';

export interface EmbeddingProviderInfo {
  id: EmbeddingModelProvider;
  name: string;
  type: 'local' | 'cloud';
  endpoint: string;
  modelsEndpoint: string;
  embeddingEndpoint: string;
  apiKeyRequired: boolean;
  website?: string;
  apiApplyUrl?: string;
  description: string;
  recommendedModels: Array<{
    name: string;
    dimensions: number;
    maxTokens: number;
    description?: string;
  }>;
  tips: string[];
  isChinese?: boolean;
  specialFeatures?: string[];
}

export const embeddingProviders: EmbeddingProviderInfo[] = [
  // ========== 本地部署 ==========
  {
    id: 'ollama',
    name: 'Ollama (本地)',
    type: 'local',
    endpoint: 'http://localhost:11434',
    modelsEndpoint: '/api/tags',
    embeddingEndpoint: '/api/embeddings',
    apiKeyRequired: false,
    description: '本地运行的Embedding模型，数据完全本地处理，无需联网，隐私性最佳',
    recommendedModels: [
      { 
        name: 'nomic-embed-text', 
        dimensions: 768, 
        maxTokens: 2048,
        description: '推荐：高质量的通用嵌入模型'
      },
      { 
        name: 'all-minilm', 
        dimensions: 384, 
        maxTokens: 512,
        description: '轻量级：速度快，资源占用低'
      },
      { 
        name: 'mxbai-embed-large', 
        dimensions: 1024, 
        maxTokens: 512,
        description: '大模型：更好的语义理解能力'
      }
    ],
    tips: [
      '需要先安装Ollama：访问 https://ollama.com/download',
      '拉取模型：ollama pull nomic-embed-text',
      '启动服务：ollama serve',
      'API Key留空或填写任意字符',
      '模型名称填写已下载的模型名，如：nomic-embed-text'
    ]
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (本地)',
    type: 'local',
    endpoint: 'http://localhost:1234',
    modelsEndpoint: '/v1/models',
    embeddingEndpoint: '/v1/embeddings',
    apiKeyRequired: false,
    description: '图形化本地模型管理工具，支持加载任意Sentence-BERT模型，适合高级用户',
    recommendedModels: [
      { 
        name: 'sentence-transformers/all-MiniLM-L6-v2', 
        dimensions: 384, 
        maxTokens: 512,
        description: '轻量快速，适合大多数场景'
      },
      { 
        name: 'sentence-transformers/all-mpnet-base-v2', 
        dimensions: 768, 
        maxTokens: 512,
        description: '质量更好，语义理解更强'
      },
      { 
        name: 'BAAI/bge-large-zh-v1.5', 
        dimensions: 1024, 
        maxTokens: 512,
        description: '中文优化，中文场景推荐'
      }
    ],
    tips: [
      '下载并安装LM Studio：https://lmstudio.ai',
      '在App中搜索并下载Embedding模型',
      '启动本地服务器（Local Server标签页）',
      '默认端口为1234，可在设置中修改',
      '支持任意HuggingFace格式的Embedding模型'
    ]
  },
  
  // ========== 国内云服务商 ==========
  {
    id: 'siliconflow',
    name: '硅基流动 (推荐)',
    type: 'cloud',
    endpoint: 'https://api.siliconflow.cn/v1',
    modelsEndpoint: '/models',
    embeddingEndpoint: '/embeddings',
    apiKeyRequired: true,
    website: 'https://siliconflow.cn',
    apiApplyUrl: 'https://siliconflow.cn/console/apikey',
    description: '提供多种开源Embedding模型，包括bge-m3、千问Embedding等，OpenAI API完全兼容，性价比高',
    recommendedModels: [
      { 
        name: 'BAAI/bge-m3', 
        dimensions: 1024, 
        maxTokens: 8192,
        description: '⭐ 强烈推荐：多语言，支持8192 tokens长文本'
      },
      { 
        name: 'Pro/BAAI/bge-m3', 
        dimensions: 1024, 
        maxTokens: 8192,
        description: '专业版：质量更高，适合生产环境'
      },
      { 
        name: 'BAAI/bge-large-zh-v1.5', 
        dimensions: 1024, 
        maxTokens: 512,
        description: '中文优化：在中文场景下表现优秀'
      },
      { 
        name: 'Qwen/Qwen3-Embedding-8B', 
        dimensions: 4096, 
        maxTokens: 32768,
        description: '超长上下文：支持32768 tokens，适合长文档'
      },
      { 
        name: 'Qwen/Qwen3-Embedding-4B', 
        dimensions: 2048, 
        maxTokens: 32768,
        description: '平衡选择：性能和质量的平衡'
      }
    ],
    // pricing: '约0.5元/百万tokens',
    tips: [
      '注册即送免费额度，新用户友好',
      'OpenAI API完全兼容，易于接入',
      '推荐bge-m3模型，效果优秀且性价比高',
      '支持BAAI、阿里千问等多个系列模型',
      '国内访问速度快，稳定性高'
    ],
    isChinese: true
  },
  {
    id: 'bailian',
    name: '阿里百炼 (推荐)',
    type: 'cloud',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelsEndpoint: '/models',
    embeddingEndpoint: '/embeddings',
    apiKeyRequired: true,
    website: 'https://bailian.aliyun.com',
    apiApplyUrl: 'https://bailian.aliyun.com/console#/api-key',
    description: '阿里云出品，text-embedding-v3效果优秀，支持动态维度调整，企业级稳定性',
    recommendedModels: [
      { 
        name: 'text-embedding-v3', 
        dimensions: 1024, 
        maxTokens: 8192,
        description: '⭐ 最新版：效果最佳，支持动态维度调整'
      },
      { 
        name: 'text-embedding-v2', 
        dimensions: 1024, 
        maxTokens: 8192,
        description: '稳定版：经过广泛验证，稳定可靠'
      },
      { 
        name: 'text-embedding-v1', 
        dimensions: 1536, 
        maxTokens: 2048,
        description: '上一代模型：兼容性好'
      }
    ],
    // pricing: '约0.5元/百万tokens',
    tips: [
      '需要阿里云账号并开通百炼服务',
      '支持dimensions参数自定义输出维度（768/1024/1536）',
      'text-embedding-v3是目前中文效果最好的模型之一',
      '阿里云企业级稳定性保障',
      '支持encoding_format: float或base64'
    ],
    isChinese: true,
    specialFeatures: ['动态维度调整']
  },
  {
    id: 'volcano',
    name: '字节火山云',
    type: 'cloud',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
    modelsEndpoint: '/models',
    embeddingEndpoint: '/embeddings',
    apiKeyRequired: true,
    website: 'https://www.volcengine.com/product/ark',
    apiApplyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apikey',
    description: '字节跳动旗下，豆包Embedding模型，通过火山方舟平台提供服务',
    recommendedModels: [
      { 
        name: 'doubao-embedding', 
        dimensions: 1024, 
        maxTokens: 4096,
        description: '豆包嵌入模型：字节自研，效果稳定'
      },
      { 
        name: 'doubao-embedding-large', 
        dimensions: 2048, 
        maxTokens: 4096,
        description: '大版本：更高维度，更好的表达能力'
      }
    ],
    // pricing: '按量计费',
    tips: [
      '需要在火山方舟平台创建推理接入点',
      '模型名称为接入点ID（格式如：ep-20240101-xxxxxx）',
      '在控制台创建接入点后，复制ID作为模型名称使用',
      '支持字节跳动的豆包系列模型',
      '适合已在使用火山云服务的用户'
    ],
    isChinese: true
  },
  
  // ========== 国际服务商 ==========
  {
    id: 'openai-compatible',
    name: 'OpenAI / OpenAI兼容',
    type: 'cloud',
    endpoint: 'https://api.openai.com/v1',
    modelsEndpoint: '/models',
    embeddingEndpoint: '/embeddings',
    apiKeyRequired: true,
    website: 'https://platform.openai.com',
    apiApplyUrl: 'https://platform.openai.com/api-keys',
    description: 'OpenAI官方Embedding API，业界标杆，也可用于其他OpenAI兼容服务',
    recommendedModels: [
      { 
        name: 'text-embedding-3-large', 
        dimensions: 3072, 
        maxTokens: 8192,
        description: '效果最好：最高质量的嵌入向量'
      },
      { 
        name: 'text-embedding-3-small', 
        dimensions: 1536, 
        maxTokens: 8192,
        description: '⭐ 性价比：速度快，价格优惠，推荐大多数场景'
      },
      { 
        name: 'text-embedding-ada-002', 
        dimensions: 1536, 
        maxTokens: 8192,
        description: '上一代模型：兼容性最好'
      }
    ],
    // pricing: 'text-embedding-3-small: $0.02/百万tokens',
    tips: [
      '需要国际信用卡支付',
      'API Key在OpenAI平台获取',
      '部分地区需要科学上网',
      '支持dimensions参数减少向量维度',
      'text-embedding-3-small性价比最高'
    ],
    isChinese: false
  }
];

// 快速添加配置模板
export const quickAddTemplates: Array<{
  id: string;
  name: string;
  provider: EmbeddingModelProvider;
  modelName: string;
  icon: string;
}> = [
  { id: 'siliconflow-bge-m3', name: '硅基流动 bge-m3', provider: 'siliconflow', modelName: 'BAAI/bge-m3', icon: '🚀' },
  { id: 'bailian-v3', name: '阿里百炼 v3', provider: 'bailian', modelName: 'text-embedding-v3', icon: '🔥' },
  { id: 'ollama-local', name: 'Ollama本地', provider: 'ollama', modelName: 'nomic-embed-text', icon: '⚡' },
  { id: 'openai-api', name: 'OpenAI', provider: 'openai-compatible', modelName: 'text-embedding-3-small', icon: '🌐' },
  { id: 'lmstudio-local', name: 'LM Studio', provider: 'lmstudio', modelName: 'sentence-transformers/all-MiniLM-L6-v2', icon: '💻' },
  { id: 'volcano-ark', name: '火山云', provider: 'volcano', modelName: 'doubao-embedding', icon: '📦' }
];

// 获取默认配置参数
export const getDefaultEmbeddingParams = (provider: EmbeddingModelProvider) => {
  switch (provider) {
    case 'ollama':
      return {
        dimensions: 768,
        maxSequenceLength: 2048,
        batchSize: 8,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'lmstudio':
      return {
        dimensions: 384,
        maxSequenceLength: 512,
        batchSize: 8,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'siliconflow':
      return {
        dimensions: 1024,
        maxSequenceLength: 8192,
        batchSize: 16,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'bailian':
      return {
        dimensions: 1024,
        maxSequenceLength: 8192,
        batchSize: 16,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'volcano':
      return {
        dimensions: 1024,
        maxSequenceLength: 4096,
        batchSize: 16,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    case 'openai-compatible':
      return {
        dimensions: 1536,
        maxSequenceLength: 8192,
        batchSize: 16,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
    default:
      return {
        dimensions: 1024,
        maxSequenceLength: 2048,
        batchSize: 8,
        timeout: 30000,
        normalizeEmbeddings: true,
        poolingStrategy: 'mean' as const,
        truncate: 'end' as const
      };
  }
};
