import { ModelConfig } from '../../types';

export class ModelListService {
  // 缓存时间：1小时
  private static readonly CACHE_DURATION = 60 * 60 * 1000;
  
  // 从模型提供商API获取模型列表
  static async fetchModels(model: ModelConfig): Promise<string[]> {
    // 检查缓存是否有效
    if (this.isCacheValid(model)) {
      return model.availableModels || [];
    }
    
    // 标记为正在获取
    model.isFetchingModels = true;
    
    try {
      let models: string[] = [];
      
      // 根据提供商类型使用不同的API
      switch (model.provider) {
        case 'openai-compatible':
          models = await this.fetchFromOpenAICompatible(model);
          break;
        case 'ollama':
          models = await this.fetchFromOllama(model);
          break;
        case 'gemini':
          models = await this.fetchFromGemini(model);
          break;
        default:
          models = [];
      }
      
      // 更新缓存
      model.availableModels = models;
      model.modelsLastFetched = Date.now();
      model.modelsFetchError = undefined;
      
      return models;
    } catch (error: any) {
      model.modelsFetchError = error.message || '获取模型列表失败';
      throw error;
    } finally {
      model.isFetchingModels = false;
    }
  }
  
  // 从OpenAI兼容API获取模型列表
  private static async fetchFromOpenAICompatible(model: ModelConfig): Promise<string[]> {
    const endpoint = model.endpoint?.replace(/\/+$/, '') || '';
    if (!endpoint) {
      throw new Error('未配置接口地址');
    }
    
    const url = `${endpoint}/models`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${model.apiKey || ''}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data?.map((m: any) => m.id) || [];
  }
  
  // 从Ollama获取模型列表
  private static async fetchFromOllama(model: ModelConfig): Promise<string[]> {
    const endpoint = model.endpoint?.replace(/\/+$/, '') || 'http://localhost:11434';
    const url = `${endpoint}/api/tags`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ollama请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  }
  
  // 从Gemini获取模型列表（通过OpenAI兼容端点）
  private static async fetchFromGemini(model: ModelConfig): Promise<string[]> {
    // Gemini通常通过OpenAI兼容端点提供模型列表
    return this.fetchFromOpenAICompatible(model);
  }
  
  // 检查缓存是否有效
  private static isCacheValid(model: ModelConfig): boolean {
    if (!model.modelsLastFetched || !model.availableModels) {
      return false;
    }
    
    const now = Date.now();
    return (now - model.modelsLastFetched) < this.CACHE_DURATION;
  }
  
  // 清除缓存
  static clearCache(model: ModelConfig): void {
    model.availableModels = undefined;
    model.modelsLastFetched = undefined;
    model.modelsFetchError = undefined;
  }
  
}

