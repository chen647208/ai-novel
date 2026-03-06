export interface ModelProviderInfo {
  id: string;
  name: string;
  website: string;
  apiApplyUrl: string;
  openaiCompatibleUrl: string;
  modelExamples: string[];
  description: string;
  tips: string[];
  isChinese: boolean;
}

export const modelProviders: ModelProviderInfo[] = [
  {
    id: 'ali-bailian',
    name: '阿里百炼',
    website: 'https://bailian.aliyun.com',
    apiApplyUrl: 'https://bailian.aliyun.com/#/api',
    openaiCompatibleUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelExamples: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
    description: '阿里云推出的AI模型服务平台，提供通义千问系列模型',
    tips: [
      '需要阿里云账号并开通百炼服务',
      'API Key在阿里云控制台获取',
      '模型名称填写如：qwen-max',
      '支持流式输出和函数调用'
    ],
    isChinese: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    website: 'https://platform.deepseek.com',
    apiApplyUrl: 'https://platform.deepseek.com/api_keys',
    openaiCompatibleUrl: 'https://api.deepseek.com/v1',
    modelExamples: ['deepseek-chat', 'deepseek-coder'],
    description: '深度求索公司开发的AI模型，提供高质量的对话和代码生成能力',
    tips: [
      '注册后可在控制台获取API Key',
      '免费额度：每月1000万tokens',
      '模型名称填写：deepseek-chat',
      '支持128K上下文长度'
    ],
    isChinese: true
  },
  {
    id: 'zhipu',
    name: '智普清言',
    website: 'https://open.bigmodel.cn',
    apiApplyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    openaiCompatibleUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelExamples: ['glm-4', 'glm-4v', 'glm-3-turbo'],
    description: '清华智谱AI开发的GLM系列模型，在中文理解和生成方面表现优秀',
    tips: [
      '需要注册智谱AI开放平台账号',
      '新用户有免费额度',
      '模型名称填写如：glm-4',
      '支持视觉理解（glm-4v）'
    ],
    isChinese: true
  },
  {
    id: 'kimi',
    name: 'Kimi Chat',
    website: 'https://kimi.moonshot.cn',
    apiApplyUrl: 'https://platform.moonshot.cn/console/api-keys',
    openaiCompatibleUrl: 'https://api.moonshot.cn/v1',
    modelExamples: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    description: '月之暗面公司开发的Kimi智能助手，支持超长上下文（200万字）',
    tips: [
      '注册月之暗面开放平台',
      '免费额度：每月1000万tokens',
      '模型名称根据上下文长度选择',
      '支持128K超长上下文'
    ],
    isChinese: true
  },
  {
    id: 'doubao',
    name: '豆包',
    website: 'https://www.volcengine.com/product/byteplus/maas',
    apiApplyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apikey',
    openaiCompatibleUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    modelExamples: ['doubao-pro-32k', 'doubao-lite-32k'],
    description: '字节跳动推出的AI模型服务，基于云雀大模型',
    tips: [
      '需要火山引擎账号',
      '新用户有免费额度',
      '模型名称填写如：doubao-pro-32k',
      '支持函数调用和联网搜索'
    ],
    isChinese: true
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    website: 'https://siliconflow.cn',
    apiApplyUrl: 'https://siliconflow.cn/console/apikey',
    openaiCompatibleUrl: 'https://api.siliconflow.cn/v1',
    modelExamples: ['Qwen/Qwen2.5-32B-Instruct', 'deepseek-ai/DeepSeek-V2.5'],
    description: '提供国内外多种开源模型的API服务，支持多种模型托管',
    tips: [
      '支持多种开源模型',
      '按使用量计费',
      '模型名称格式：作者/模型名',
      '支持OpenAI完全兼容的API'
    ],
    isChinese: true
  },
  {
    id: 'openai',
    name: 'OpenAI',
    website: 'https://platform.openai.com',
    apiApplyUrl: 'https://platform.openai.com/api-keys',
    openaiCompatibleUrl: 'https://api.openai.com/v1',
    modelExamples: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    description: 'OpenAI官方API，提供最先进的GPT系列模型',
    tips: [
      '需要国际信用卡支付',
      'API Key在OpenAI平台获取',
      '模型名称填写如：gpt-4o',
      '部分地区需要科学上网'
    ],
    isChinese: false
  },
  {
    id: 'ollama',
    name: 'Ollama（本地模型）',
    website: 'https://ollama.com',
    apiApplyUrl: 'https://ollama.com/download',
    openaiCompatibleUrl: 'http://localhost:11434/v1',
    modelExamples: ['llama3.2', 'qwen2.5', 'mistral', 'gemma', 'phi'],
    description: '本地运行的AI模型服务，支持多种开源模型，无需网络连接，数据完全本地处理',
    tips: [
      '首先下载并安装Ollama：https://ollama.com/download',
      '在终端运行：ollama pull llama3.2 下载模型',
      '启动Ollama服务：ollama serve',
      'API Key留空或填写任意字符',
      '模型名称填写已下载的模型名，如：llama3.2',
      '支持完全离线运行，保护隐私'
    ],
    isChinese: false
  }
];


