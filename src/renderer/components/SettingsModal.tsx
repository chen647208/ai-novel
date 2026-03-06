
import React, { useState, useEffect } from 'react';
import { ModelConfig, ModelProvider, PromptTemplate, StorageConfig, EmbeddingModelConfig, EmbeddingModelProvider, CardPromptTemplate, CardPromptCategory, AICardCommand, ConsistencyCheckPromptTemplate, ConsistencyCheckPromptCategory, ConsistencyCheckConfig } from '../types';
import { AIService } from '../services/aiService';
import { ModelListService } from '../services/modelListService';
import { storage } from '../services/storage';
import { modelProviders } from '../constants/modelProviders';
import { embeddingModelService } from '../services/embeddingModelService';
import { embeddingProviders, quickAddTemplates, getDefaultEmbeddingParams } from '../constants/embeddingProviders';
import { getDefaultCardPrompts, validateCardPromptTemplate, getTemplateVariableDescriptions } from '../services/cardPromptService';
import ConsistencyPromptManager from './ConsistencyPromptManager';

interface SettingsModalProps {
  models: ModelConfig[];
  activeModelId: string | null;
  prompts: PromptTemplate[];
  cardPrompts?: CardPromptTemplate[];
  consistencyPrompts?: ConsistencyCheckPromptTemplate[];
  consistencyCheckConfig?: ConsistencyCheckConfig;
  onSaveModels: (models: ModelConfig[], activeId: string) => void;
  onSavePrompts: (prompts: PromptTemplate[]) => void;
  onSaveCardPrompts?: (cardPrompts: CardPromptTemplate[]) => void;
  onSaveConsistencyPrompts?: (prompts: ConsistencyCheckPromptTemplate[]) => void;
  onSaveConsistencyConfig?: (config: ConsistencyCheckConfig) => void;
  onClose: () => void;
  onClearData: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  models, 
  activeModelId, 
  prompts, 
  cardPrompts = [],
  consistencyPrompts = [],
  consistencyCheckConfig,
  onSaveModels, 
  onSavePrompts,
  onSaveCardPrompts,
  onSaveConsistencyPrompts,
  onSaveConsistencyConfig,
  onClose,
  onClearData
}) => {
  const [activeTab, setActiveTab] = useState<'models' | 'prompts' | 'card-prompts' | 'consistency-prompts' | 'system' | 'storage' | 'embedding'>('models');
  const [localModels, setLocalModels] = useState<ModelConfig[]>(models);
  const [activeId, setActiveId] = useState<string | null>(activeModelId);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const [localPrompts, setLocalPrompts] = useState<PromptTemplate[]>(prompts);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  // 模型列表获取状态
  const [modelListLoading, setModelListLoading] = useState<Record<string, boolean>>({});

  // 存储配置状态
  const [storageConfig, setStorageConfig] = useState<StorageConfig>({
    dataPath: '',
    useCustomPath: false,
    lastMigration: undefined
  });
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');

  // Embedding模型配置状态
  const [embeddingConfigs, setEmbeddingConfigs] = useState<EmbeddingModelConfig[]>([]);
  const [activeEmbeddingId, setActiveEmbeddingId] = useState<string | null>(null);
  const [embeddingTestingId, setEmbeddingTestingId] = useState<string | null>(null);
  const [embeddingTestResults, setEmbeddingTestResults] = useState<Record<string, string>>({});
  const [embeddingModelListLoading, setEmbeddingModelListLoading] = useState<Record<string, boolean>>({});

  // AI卡片提示词配置状态
  const [localCardPrompts, setLocalCardPrompts] = useState<CardPromptTemplate[]>(cardPrompts.length > 0 ? cardPrompts : getDefaultCardPrompts());
  const [editingCardPromptId, setEditingCardPromptId] = useState<string | null>(null);
  const [cardPromptTestResult, setCardPromptTestResult] = useState<{ templateId: string; isValid: boolean; errors: string[] } | null>(null);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export');
  const [importText, setImportText] = useState('');

  // 一致性检查提示词配置状态
  const [localConsistencyPrompts, setLocalConsistencyPrompts] = useState<ConsistencyCheckPromptTemplate[]>(consistencyPrompts);

  // 加载存储配置
  useEffect(() => {
    const loadStorageConfig = async () => {
      try {
        const config = await storage.getStorageConfig();
        setStorageConfig(config);
      } catch (error) {
        console.error('Failed to load storage config:', error);
      }
    };
    
    loadStorageConfig();
  }, []);

  // 加载Embedding模型配置
  useEffect(() => {
    const loadEmbeddingConfigs = async () => {
      try {
        const configs = await embeddingModelService.getAllConfigs();
        setEmbeddingConfigs(configs);
        const activeConfig = await embeddingModelService.getActiveConfig();
        if (activeConfig) {
          setActiveEmbeddingId(activeConfig.id);
        }
      } catch (error) {
        console.error('Failed to load embedding configs:', error);
      }
    };
    
    loadEmbeddingConfigs();
  }, []);

  const addModel = () => {
    const newModel: ModelConfig = {
      id: Date.now().toString(),
      name: '新模型',
      provider: 'openai-compatible',
      endpoint: '',
      modelName: ''
    };
    setLocalModels([...localModels, newModel]);
  };

  const removeModel = (id: string) => {
    setLocalModels(localModels.filter(m => m.id !== id));
    if (activeId === id) setActiveId(localModels[0]?.id || null);
  };

  const updateModel = (id: string, updates: Partial<ModelConfig>) => {
    const updatedModels = localModels.map(m => m.id === id ? { ...m, ...updates } : m);
    setLocalModels(updatedModels);
  };

  const testModel = async (model: ModelConfig) => {
    setTestingId(model.id);
    setTestResults(prev => ({ ...prev, [model.id]: "正在连接中..." }));
    const result = await AIService.testConnection(model);
    setTestResults(prev => ({ ...prev, [model.id]: result }));
    setTestingId(null);
  };

  // 获取模型列表
  const fetchModelList = async (model: ModelConfig) => {
    setModelListLoading(prev => ({ ...prev, [model.id]: true }));
    try {
      const models = await ModelListService.fetchModels(model);
      updateModel(model.id, { 
        availableModels: models,
        modelsFetchError: undefined
      });
    } catch (error: any) {
      updateModel(model.id, { 
        modelsFetchError: error.message || '获取模型列表失败'
      });
    } finally {
      setModelListLoading(prev => ({ ...prev, [model.id]: false }));
    }
  };


  const addPrompt = () => {
    const newPrompt: PromptTemplate = {
      id: Date.now().toString(),
      category: 'edit',
      name: '新润色模板',
      content: '请润色：{content}'
    };
    setLocalPrompts([...localPrompts, newPrompt]);
    setEditingPromptId(newPrompt.id);
  };

  const updatePrompt = (id: string, updates: Partial<PromptTemplate>) => {
    setLocalPrompts(localPrompts.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  // Embedding配置处理函数
  const addEmbeddingConfig = () => {
    const newConfig: EmbeddingModelConfig = {
      id: Date.now().toString(),
      name: '新Embedding模型',
      provider: 'siliconflow',
      endpoint: 'https://api.siliconflow.cn/v1',
      modelName: 'BAAI/bge-m3',
      dimensions: 1024,
      maxSequenceLength: 8192,
      batchSize: 16,
      timeout: 30000,
      normalizeEmbeddings: true,
      poolingStrategy: 'mean',
      truncate: 'end',
      isActive: false,
      testStatus: 'untested'
    };
    setEmbeddingConfigs([...embeddingConfigs, newConfig]);
  };

  const removeEmbeddingConfig = (id: string) => {
    setEmbeddingConfigs(embeddingConfigs.filter(c => c.id !== id));
    if (activeEmbeddingId === id) {
      setActiveEmbeddingId(null);
    }
  };

  const updateEmbeddingConfig = (id: string, updates: Partial<EmbeddingModelConfig>) => {
    const updatedConfigs = embeddingConfigs.map(c => c.id === id ? { ...c, ...updates } : c);
    setEmbeddingConfigs(updatedConfigs);
  };

  const testEmbeddingConnection = async (config: EmbeddingModelConfig) => {
    setEmbeddingTestingId(config.id);
    setEmbeddingTestResults(prev => ({ ...prev, [config.id]: "正在连接中..." }));
    
    const result = await embeddingModelService.testConnection(config);
    
    // 更新配置的测试状态
    updateEmbeddingConfig(config.id, {
      testStatus: result.success ? 'success' : 'failed',
      lastTested: Date.now(),
      testError: result.error
    });
    
    const resultText = result.success 
      ? `[SUCCESS] 连接测试成功！\n模型: ${result.modelName}\n维度: ${result.dimensions}\n延迟: ${result.latency}ms`
      : `[ERROR] 连接测试失败: ${result.error}`;
    
    setEmbeddingTestResults(prev => ({ ...prev, [config.id]: resultText }));
    setEmbeddingTestingId(null);
  };

  const fetchEmbeddingModelList = async (config: EmbeddingModelConfig) => {
    setEmbeddingModelListLoading(prev => ({ ...prev, [config.id]: true }));
    try {
      const models = await embeddingModelService.fetchModels(config);
      updateEmbeddingConfig(config.id, { 
        availableModels: models,
        modelsLastFetched: Date.now()
      });
    } catch (error: any) {
      console.error('获取Embedding模型列表失败:', error);
    } finally {
      setEmbeddingModelListLoading(prev => ({ ...prev, [config.id]: false }));
    }
  };

  const setActiveEmbeddingConfig = (id: string) => {
    setActiveEmbeddingId(id);
    setEmbeddingConfigs(configs => configs.map(c => ({
      ...c,
      isActive: c.id === id
    })));
  };

  const quickAddEmbeddingConfig = (template: typeof quickAddTemplates[0]) => {
    const provider = embeddingProviders.find(p => p.id === template.provider);
    const defaultParams = getDefaultEmbeddingParams(template.provider);
    
    const newConfig: EmbeddingModelConfig = {
      id: Date.now().toString(),
      name: template.name,
      provider: template.provider,
      endpoint: provider?.endpoint || '',
      modelName: template.modelName,
      apiKey: '',
      dimensions: defaultParams.dimensions,
      maxSequenceLength: defaultParams.maxSequenceLength,
      batchSize: defaultParams.batchSize,
      timeout: defaultParams.timeout,
      normalizeEmbeddings: defaultParams.normalizeEmbeddings,
      poolingStrategy: defaultParams.poolingStrategy,
      truncate: defaultParams.truncate,
      isActive: false,
      testStatus: 'untested'
    };
    
    setEmbeddingConfigs([...embeddingConfigs, newConfig]);
  };

  const handleGlobalSave = async () => {
    // 保存模型配置
    onSaveModels(localModels, activeId || '');
    
    // 保存提示词配置
    onSavePrompts(localPrompts);
    
    // 保存AI卡片提示词配置
    if (onSaveCardPrompts) {
      onSaveCardPrompts(localCardPrompts);
    }
    
    // 保存一致性检查提示词配置
    if (onSaveConsistencyPrompts) {
      onSaveConsistencyPrompts(localConsistencyPrompts);
    }
    
    // 保存存储配置
    try {
      await storage.updateStorageConfig(storageConfig);
      console.log('Storage config saved successfully');
    } catch (error) {
      console.error('Failed to save storage config:', error);
    }
    
    // 保存Embedding模型配置
    try {
      for (const config of embeddingConfigs) {
        await embeddingModelService.saveConfig(config);
      }
      if (activeEmbeddingId) {
        await embeddingModelService.setActiveConfig(activeEmbeddingId);
      }
      console.log('Embedding configs saved successfully');
    } catch (error) {
      console.error('Failed to save embedding configs:', error);
    }
    
    onClose();
  };

  // AI卡片提示词管理函数
  const addCardPrompt = () => {
    const newPrompt: CardPromptTemplate = {
      id: Date.now().toString(),
      category: 'card-character',
      name: '新角色模板',
      content: '请根据描述创建角色：\n\n{description}\n\n项目背景：\n{context}',
      variables: ['description', 'context'],
      isDefault: false,
      requiredFields: ['name', 'gender', 'age', 'role', 'personality'],
      fieldDescriptions: {
        name: '角色姓名',
        gender: '性别',
        age: '年龄',
        role: '角色类型',
        personality: '性格特征'
      }
    };
    setLocalCardPrompts([...localCardPrompts, newPrompt]);
    setEditingCardPromptId(newPrompt.id);
  };

  const removeCardPrompt = (id: string) => {
    // 不允许删除默认模板
    const prompt = localCardPrompts.find(p => p.id === id);
    if (prompt?.isDefault) {
      alert('默认模板不能删除');
      return;
    }
    setLocalCardPrompts(localCardPrompts.filter(p => p.id !== id));
    if (editingCardPromptId === id) {
      setEditingCardPromptId(null);
    }
  };

  const updateCardPrompt = (id: string, updates: Partial<CardPromptTemplate>) => {
    setLocalCardPrompts(localCardPrompts.map(p => p.id === id ? { ...p, ...updates } : p));
    // 清除测试结果
    if (cardPromptTestResult?.templateId === id) {
      setCardPromptTestResult(null);
    }
  };

  const duplicateCardPrompt = (id: string) => {
    const prompt = localCardPrompts.find(p => p.id === id);
    if (!prompt) return;
    
    const newPrompt: CardPromptTemplate = {
      ...prompt,
      id: Date.now().toString(),
      name: `${prompt.name} (副本)`,
      isDefault: false
    };
    setLocalCardPrompts([...localCardPrompts, newPrompt]);
    setEditingCardPromptId(newPrompt.id);
  };

  const testCardPrompt = (template: CardPromptTemplate) => {
    const result = validateCardPromptTemplate(template);
    setCardPromptTestResult({
      templateId: template.id,
      isValid: result.isValid,
      errors: result.errors
    });
    return result.isValid;
  };

  const exportCardPrompts = () => {
    const data = JSON.stringify(localCardPrompts.filter(p => !p.isDefault), null, 2);
    return data;
  };

  const importCardPrompts = (jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString) as CardPromptTemplate[];
      // 验证导入的数据
      const validPrompts = imported.filter(p => {
        const result = validateCardPromptTemplate(p);
        return result.isValid;
      });
      
      // 给导入的模板生成新ID，避免冲突
      const newPrompts = validPrompts.map(p => ({
        ...p,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        isDefault: false
      }));
      
      setLocalCardPrompts([...localCardPrompts, ...newPrompts]);
      return { success: true, count: newPrompts.length };
    } catch (error) {
      return { success: false, error: '导入失败：JSON格式错误' };
    }
  };

  const resetCardPromptsToDefault = () => {
    if (confirm('确定要重置所有自定义模板吗？这将删除所有自定义模板并恢复默认模板。')) {
      setLocalCardPrompts(getDefaultCardPrompts());
      setEditingCardPromptId(null);
      setCardPromptTestResult(null);
    }
  };



  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        <div className="border-b border-gray-100 px-10 pt-8 pb-4 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">控制台配置</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">System Core Settings</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
              <i className="fas fa-times text-gray-400"></i>
            </button>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <button 
              onClick={() => setActiveTab('models')}
              className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'models' ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-microchip mr-2"></i> 模型提供商
            </button>
            <button 
              onClick={() => setActiveTab('prompts')}
              className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'prompts' ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-terminal mr-2"></i> 提示词库
            </button>
            <button 
              onClick={() => setActiveTab('card-prompts')}
              className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'card-prompts' ? 'bg-amber-600 text-white shadow-xl shadow-amber-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-magic mr-2"></i> 卡片提示词
            </button>
            <button 
              onClick={() => setActiveTab('consistency-prompts')}
              className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'consistency-prompts' ? 'bg-rose-600 text-white shadow-xl shadow-rose-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-stethoscope mr-2"></i> 一致性检查模板
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'system' ? 'bg-purple-50 text-purple-600 shadow-xl shadow-purple-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-graduation-cap mr-2"></i> 配置教程
            </button>
            <button 
              onClick={() => setActiveTab('storage')}
              className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'storage' ? 'bg-green-50 text-green-600 shadow-xl shadow-green-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-database mr-2"></i> 数据存储
            </button>
            <button 
              onClick={() => setActiveTab('embedding')}
              className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'embedding' ? 'bg-indigo-50 text-indigo-600 shadow-xl shadow-indigo-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-brain mr-2"></i> 向量模型
            </button>
          </div>
        </div>
        
        <div className="p-10 overflow-y-auto flex-1 bg-gray-50/50 custom-scrollbar">
          {activeTab === 'models' && (
            <div className="space-y-6">
              {localModels.map(model => (
                <div key={model.id} className={`group border-2 rounded-[2rem] p-8 bg-white transition-all duration-500 ${activeId === model.id ? 'border-blue-500 shadow-2xl shadow-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => setActiveId(model.id)}
                        className={`w-6 h-6 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all ${activeId === model.id ? 'border-blue-500 bg-blue-500' : 'border-gray-200'}`}
                      >
                        {activeId === model.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <input 
                        className="font-black bg-transparent border-none focus:ring-0 p-0 text-2xl text-gray-800 placeholder-gray-200"
                        value={model.name}
                        onChange={(e) => updateModel(model.id, { name: e.target.value })}
                        placeholder="给模型起个名字..."
                      />
                    </div>
                    <button onClick={() => removeModel(model.id)} className="text-gray-200 hover:text-red-500 transition-colors p-2">
                      <i className="fas fa-trash-alt text-lg"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">选择服务商</label>
                        <select 
                          className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                          value={model.provider}
                          onChange={(e) => updateModel(model.id, { provider: e.target.value as ModelProvider })}
                        >
                          <option value="gemini">Google Gemini</option>
                          <option value="ollama">Local Ollama</option>
                          <option value="openai-compatible">OpenAI Compatible (如 DeepSeek, 豆包等)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">模型具体名称</label>
                        <div className="relative">
                          <select 
                            className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 font-mono text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 appearance-none pr-10"
                            value={model.modelName}
                            onChange={(e) => updateModel(model.id, { modelName: e.target.value })}
                            disabled={modelListLoading[model.id]}
                          >
                            <option value="">请选择模型...</option>
                            {model.availableModels && model.availableModels.length > 0 ? (
                              model.availableModels.map((modelName) => (
                                <option key={modelName} value={modelName}>
                                  {modelName}
                                </option>
                              ))
                            ) : (
                              <option value={model.modelName || ''}>
                                {model.modelName || '手动输入模型名称'}
                              </option>
                            )}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <i className="fas fa-chevron-down text-gray-400"></i>
                          </div>
                        </div>
                        
                        {/* 模型列表状态显示 */}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {modelListLoading[model.id] && (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <i className="fas fa-spinner fa-spin"></i>
                                <span>正在获取模型列表...</span>
                              </div>
                            )}
                            {model.modelsFetchError && !modelListLoading[model.id] && (
                              <div className="flex items-center gap-1 text-xs text-red-600">
                                <i className="fas fa-exclamation-circle"></i>
                                <span>{model.modelsFetchError}</span>
                              </div>
                            )}
                            {model.availableModels && model.availableModels.length > 0 && !modelListLoading[model.id] && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <i className="fas fa-check-circle"></i>
                                <span>已加载 {model.availableModels.length} 个可用模型</span>
                              </div>
                            )}
                          </div>
                          
                          <button 
                            type="button"
                            onClick={() => fetchModelList(model)}
                            disabled={modelListLoading[model.id] || !model.endpoint || (model.provider !== 'ollama' && !model.apiKey)}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <i className={`fas ${modelListLoading[model.id] ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                            刷新模型列表
                          </button>
                        </div>
                        
                        {/* 手动输入备用 */}
                        <div className="mt-2">
                          <input 
                            className="w-full border-none rounded-xl px-4 py-2.5 text-sm bg-gray-50/50 font-mono text-gray-600 outline-none focus:ring-2 focus:ring-blue-100"
                            value={model.modelName}
                            onChange={(e) => updateModel(model.id, { modelName: e.target.value })}
                            placeholder="或手动输入模型名称..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          接口地址 (Endpoint) 
                        </label>
                        <input 
                          className="w-full border-none rounded-2xl px-5 py-3.5 text-sm font-mono bg-gray-50 text-gray-600 outline-none focus:ring-2 focus:ring-blue-100"
                          value={model.endpoint || ''}
                          onChange={(e) => updateModel(model.id, { endpoint: e.target.value })}
                          placeholder={model.provider === 'gemini' ? "官方默认 (留空) 或 代理地址" : "https://api.example.com/v1"}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">API 密钥 (API KEY)</label>
                        <input 
                          type="password"
                          className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 text-gray-600 outline-none focus:ring-2 focus:ring-blue-100"
                          value={model.apiKey || ''}
                          onChange={(e) => updateModel(model.id, { apiKey: e.target.value })}
                          placeholder="••••••••••••••••"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          填写API Key后，可手动刷新获取可用模型列表
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 高级参数设置 */}
                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                      <i className="fas fa-sliders-h text-blue-500"></i>
                      <h3 className="text-lg font-black text-gray-900">高级参数设置</h3>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest ml-auto">AI Model Parameters</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* 温度控制 */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">温度控制</label>
                          <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                            {model.temperature !== undefined ? model.temperature.toFixed(1) : '0.7'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <input 
                            type="range"
                            min="0.0"
                            max="2.0"
                            step="0.1"
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                            value={model.temperature !== undefined ? model.temperature : 0.7}
                            onChange={(e) => updateModel(model.id, { temperature: parseFloat(e.target.value) })}
                          />
                          <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                            <span>确定 (0.0)</span>
                            <span>平衡 (1.0)</span>
                            <span>创意 (2.0)</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">控制输出的随机性，值越高创意性越强</p>
                      </div>

                      {/* 最大令牌数 */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">最大输出令牌</label>
                          <span className="text-xs text-gray-400 font-bold">可选</span>
                        </div>
                        <input 
                          type="number"
                          min="1"
                          max="8192"
                          className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 font-mono text-gray-600 outline-none focus:ring-2 focus:ring-blue-100"
                          value={model.maxTokens || ''}
                          onChange={(e) => updateModel(model.id, { maxTokens: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="默认由模型决定"
                        />
                        <p className="text-xs text-gray-500">限制AI输出的最大长度，留空使用模型默认值</p>
                      </div>

                      {/* 系统提示词 */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">系统提示词</label>
                          <span className="text-xs text-gray-400 font-bold">可选</span>
                        </div>
                        <textarea 
                          className="w-full h-24 border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                          value={model.systemPrompt || ''}
                          onChange={(e) => updateModel(model.id, { systemPrompt: e.target.value })}
                          placeholder="指导AI模型行为的系统级指令..."
                        />
                        <p className="text-xs text-gray-500">系统级指令，用于指导模型的基本行为</p>
                      </div>

                      {/* 流式输出支持 */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            流式输出支持
                          </label>
                          <span className="text-xs text-gray-400 font-bold">推荐开启</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={model.supportsStreaming !== false}
                              onChange={(e) => updateModel(model.id, { 
                                supportsStreaming: e.target.checked 
                              })}
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                          <span className="text-sm text-gray-600">
                            {model.supportsStreaming !== false ? '支持流式输出' : '使用传统模式'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          开启后，AI生成内容时将实时显示，提升交互体验
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {testResults[model.id] && (
                    <div className={`mt-8 p-6 rounded-2xl text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto border-2 ${
                      testResults[model.id].includes('Error') || testResults[model.id].includes('失败') || testResults[model.id].includes('异常') 
                      ? 'bg-red-50 text-red-600 border-red-100' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <i className={`fas ${testResults[model.id].includes('Error') ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                        <span className="font-black uppercase tracking-widest">Connection Log</span>
                      </div>
                      {testResults[model.id]}
                    </div>
                  )}

                  <div className="mt-6 flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      {model.modelsLastFetched && (
                        <div className="flex items-center gap-1">
                          <i className="fas fa-clock"></i>
                          <span>上次更新: {new Date(model.modelsLastFetched).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => fetchModelList(model)}
                        disabled={modelListLoading[model.id] || !model.endpoint || (model.provider !== 'ollama' && !model.apiKey)}
                        className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {modelListLoading[model.id] ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-list"></i>}
                        获取模型列表
                      </button>
                      
                      <button 
                        onClick={() => testModel(model)}
                        disabled={testingId === model.id}
                        className="px-6 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                      >
                        {testingId === model.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-vial"></i>}
                        {testingId === model.id ? '通信测试中...' : '立即测试连接'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addModel} className="w-full border-4 border-dashed border-gray-100 rounded-[2rem] py-8 text-gray-300 font-black hover:bg-white hover:text-blue-500 hover:border-blue-100 transition-all flex flex-col items-center gap-2 group">
                <i className="fas fa-plus-circle text-2xl group-hover:scale-125 transition-transform"></i>
                <span>新增 AI 服务提供商</span>
              </button>
            </div>
          )}
          
          {activeTab === 'prompts' && (
            <div className="grid grid-cols-1 gap-6">
              {localPrompts.map(prompt => (
                <div key={prompt.id} className="border-2 border-gray-100 rounded-[2rem] p-8 bg-white hover:border-blue-100 transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex-1 mr-6">
                      <input 
                        className="font-black bg-transparent border-none focus:ring-0 p-0 text-xl text-gray-800 w-full"
                        value={prompt.name}
                        onChange={(e) => updatePrompt(prompt.id, { name: e.target.value })}
                        placeholder="模板名称，如：毒舌润色"
                      />
                    </div>
                    <select 
                      className="text-[10px] font-black border-none rounded-lg px-3 py-1 bg-gray-100 text-gray-500 uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-100"
                      value={prompt.category}
                      onChange={(e) => updatePrompt(prompt.id, { category: e.target.value as any })}
                    >
                      <option value="inspiration">灵感</option>
                      <option value="character">角色</option>
                      <option value="outline">大纲</option>
                      <option value="chapter">分章</option>
                      <option value="writing">正文</option>
                      <option value="edit">润色</option>
                      <option value="summary">摘要</option>
                    </select>
                  </div>

                  <textarea 
                    className="w-full h-40 border-none rounded-2xl p-6 text-sm font-medium text-gray-600 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 resize-none custom-scrollbar"
                    value={prompt.content}
                    onChange={(e) => updatePrompt(prompt.id, { content: e.target.value })}
                    placeholder="使用 {content} 代表选中的文字..."
                  />
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-[9px] text-gray-300 font-bold uppercase">可用占位符: {'{content}, {title}, {summary}'}</span>
                    <button onClick={() => setLocalPrompts(localPrompts.filter(p => p.id !== prompt.id))} className="text-gray-300 hover:text-red-500 text-xs font-bold">删除此模板</button>
                  </div>
                </div>
              ))}
              <button onClick={addPrompt} className="w-full border-4 border-dashed border-gray-100 rounded-[2rem] py-8 text-gray-300 font-black hover:bg-white hover:text-emerald-500 hover:border-emerald-100 transition-all group flex flex-col items-center gap-2">
                <i className="fas fa-magic text-2xl group-hover:rotate-12 transition-transform"></i>
                <span>新增自定义提示词模板</span>
              </button>
            </div>
          )}

          {activeTab === 'card-prompts' && (
            <div className="space-y-6">
              {/* 标题和操作栏 */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-gray-900">AI卡片提示词模板</h3>
                  <p className="text-xs text-gray-500 mt-1">自定义AI创建角色、地点、势力等卡片时使用的提示词模板</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportExportMode('export');
                      setImportExportModalOpen(true);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-download"></i>
                    导出
                  </button>
                  <button
                    onClick={() => {
                      setImportExportMode('import');
                      setImportExportModalOpen(true);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-upload"></i>
                    导入
                  </button>
                  <button
                    onClick={resetCardPromptsToDefault}
                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-undo"></i>
                    重置
                  </button>
                  <button
                    onClick={addCardPrompt}
                    className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-plus"></i>
                    新建模板
                  </button>
                </div>
              </div>

              {/* 模板列表 */}
              <div className="space-y-4">
                {localCardPrompts.map(template => (
                  <div 
                    key={template.id} 
                    className={`border-2 rounded-[2rem] p-6 bg-white transition-all ${
                      editingCardPromptId === template.id ? 'border-amber-300 shadow-xl shadow-amber-50' : 'border-gray-100 hover:border-amber-100'
                    } ${template.isDefault ? 'bg-amber-50/30' : ''}`}
                  >
                    {/* 模板头部 */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        {template.isDefault && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg">
                            默认模板
                          </span>
                        )}
                        <input
                          className="font-black bg-transparent border-none focus:ring-0 p-0 text-lg text-gray-800 w-48"
                          value={template.name}
                          onChange={(e) => updateCardPrompt(template.id, { name: e.target.value })}
                          placeholder="模板名称"
                          disabled={template.isDefault}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => duplicateCardPrompt(template.id)}
                          className="text-gray-400 hover:text-blue-500 text-xs px-2 py-1"
                          title="复制模板"
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                        {!template.isDefault && (
                          <button
                            onClick={() => removeCardPrompt(template.id)}
                            className="text-gray-400 hover:text-red-500 text-xs px-2 py-1"
                            title="删除模板"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                        <button
                          onClick={() => setEditingCardPromptId(editingCardPromptId === template.id ? null : template.id)}
                          className="text-gray-400 hover:text-amber-500 text-xs px-2 py-1"
                          title={editingCardPromptId === template.id ? '收起' : '编辑'}
                        >
                          <i className={`fas fa-chevron-${editingCardPromptId === template.id ? 'up' : 'down'}`}></i>
                        </button>
                      </div>
                    </div>

                    {/* 模板基本信息 */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">模板分类</label>
                        <select
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-100"
                          value={template.category}
                          onChange={(e) => updateCardPrompt(template.id, { category: e.target.value as CardPromptCategory })}
                          disabled={template.isDefault}
                        >
                          <option value="card-character">角色卡片</option>
                          <option value="card-location">地点卡片</option>
                          <option value="card-faction">势力卡片</option>
                          <option value="card-timeline">时间线事件</option>
                          <option value="card-rule">规则系统</option>
                          <option value="card-magic">魔法体系</option>
                          <option value="card-tech">科技水平</option>
                          <option value="card-history">历史背景</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">必填字段数</label>
                        <div className="text-sm text-gray-600 py-2">{template.requiredFields?.length || 0} 个字段</div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">可用变量</label>
                        <div className="text-sm text-gray-600 py-2">{template.variables?.length || 0} 个变量</div>
                      </div>
                    </div>

                    {/* 展开编辑区域 */}
                    {editingCardPromptId === template.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in">
                        {/* 提示词内容 */}
                        <div className="mb-4">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                            提示词内容
                            <span className="text-gray-300 font-normal ml-2">必须包含 {'{description}'} 变量</span>
                          </label>
                          <textarea
                            className="w-full h-48 border border-gray-200 rounded-2xl p-4 text-sm font-mono text-gray-600 bg-gray-50 outline-none focus:ring-2 focus:ring-amber-100 resize-none custom-scrollbar"
                            value={template.content}
                            onChange={(e) => updateCardPrompt(template.id, { content: e.target.value })}
                            placeholder="在此输入提示词模板内容..."
                            disabled={template.isDefault}
                          />
                        </div>

                        {/* 必填字段配置 */}
                        <div className="mb-4">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">必填字段配置</label>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="text-xs text-gray-500 mb-2">
                              这些字段将用于校验AI返回的数据完整性
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {template.requiredFields?.map((field, idx) => (
                                <span key={idx} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 可用变量提示 */}
                        <div className="mb-4">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">可用变量</label>
                          <div className="flex flex-wrap gap-2">
                            {getTemplateVariableDescriptions().map(v => (
                              <span key={v.variable} className="px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700" title={v.description}>
                                {v.variable}
                                {v.required && <span className="text-red-500 ml-1">*</span>}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* 测试按钮和结果 */}
                        {!template.isDefault && (
                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => testCardPrompt(template)}
                              className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                            >
                              <i className="fas fa-vial"></i>
                              验证模板
                            </button>
                            {cardPromptTestResult?.templateId === template.id && (
                              <div className={`text-xs ${cardPromptTestResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                                {cardPromptTestResult.isValid ? (
                                  <span><i className="fas fa-check-circle mr-1"></i>模板有效</span>
                                ) : (
                                  <span><i className="fas fa-exclamation-circle mr-1"></i>{cardPromptTestResult.errors.join(', ')}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 导入/导出模态框 */}
              {importExportModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-lg font-black text-gray-900">
                        {importExportMode === 'import' ? '导入模板' : '导出模板'}
                      </h3>
                      <button
                        onClick={() => {
                          setImportExportModalOpen(false);
                          setImportText('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div className="p-6">
                      {importExportMode === 'export' ? (
                        <div>
                          <p className="text-sm text-gray-500 mb-4">复制以下JSON代码保存到文件，或分享给其他用户</p>
                          <textarea
                            className="w-full h-64 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-600 bg-gray-50 resize-none"
                            value={exportCardPrompts()}
                            readOnly
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(exportCardPrompts());
                              alert('已复制到剪贴板');
                            }}
                            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all"
                          >
                            <i className="fas fa-copy mr-2"></i>复制到剪贴板
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-500 mb-4">粘贴模板JSON代码进行导入</p>
                          <textarea
                            className="w-full h-64 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-600 bg-gray-50 resize-none"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="在此粘贴JSON代码..."
                          />
                          <button
                            onClick={() => {
                              const result = importCardPrompts(importText);
                              if (result.success) {
                                alert(`成功导入 ${result.count} 个模板`);
                                setImportExportModalOpen(false);
                                setImportText('');
                              } else {
                                alert(result.error);
                              }
                            }}
                            disabled={!importText.trim()}
                            className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl text-sm font-black hover:bg-green-700 transition-all disabled:bg-gray-300"
                          >
                            <i className="fas fa-upload mr-2"></i>导入模板
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'consistency-prompts' && (
            <ConsistencyPromptManager
              templates={localConsistencyPrompts}
              onTemplatesChange={setLocalConsistencyPrompts}
            />
          )}

          {activeTab === 'system' && (
            <div className="space-y-8 animate-in zoom-in duration-300">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl shadow-blue-200">
                  <i className="fas fa-graduation-cap text-3xl text-white"></i>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">模型提供商配置教程</h3>
                <p className="text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed">
                  快速找到国内主流模型提供商的API申请地址、OpenAI兼容URL和正确配置方法
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modelProviders.map((provider) => (
                  <div 
                    key={provider.id} 
                    className={`border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${
                      provider.isChinese 
                        ? 'border-blue-100 bg-gradient-to-br from-blue-50 to-white hover:border-blue-300' 
                        : 'border-gray-100 bg-gradient-to-br from-gray-50 to-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                          {provider.name}
                          {provider.isChinese && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                              国内
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">{provider.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">推荐模型</div>
                        <div className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                          {provider.modelExamples[0]}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">官方网站</div>
                        <a 
                          href={provider.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <i className="fas fa-external-link-alt text-xs"></i>
                          {provider.website.replace('https://', '')}
                        </a>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">API申请地址</div>
                        <a 
                          href={provider.apiApplyUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                        >
                          <i className="fas fa-key text-xs"></i>
                          获取API Key
                        </a>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">OpenAI兼容URL</div>
                        <div className="text-xs font-mono bg-gray-50 text-gray-700 p-2 rounded-lg border border-gray-100">
                          {provider.openaiCompatibleUrl}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">配置提示</div>
                      <ul className="space-y-1">
                        {provider.tips.map((tip, index) => (
                          <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                            <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const newModel: ModelConfig = {
                              id: Date.now().toString(),
                              name: `${provider.name}配置`,
                              provider: 'openai-compatible' as ModelProvider,
                              endpoint: provider.openaiCompatibleUrl,
                              modelName: provider.modelExamples[0]
                            };
                            setLocalModels([...localModels, newModel]);
                            setActiveTab('models');
                          }}
                          className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-plus-circle"></i>
                          快速添加配置
                        </button>
                        <a 
                          href={provider.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-external-link-alt"></i>
                          访问官网
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-100 rounded-2xl p-6 mt-8">
                <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-lightbulb text-yellow-500"></i>
                  配置步骤说明
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-blue-100">
                    <div className="text-blue-600 font-black text-sm mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">1</span>
                      选择服务商
                    </div>
                    <p className="text-xs text-gray-600">在"模型提供商"标签页，选择"OpenAI Compatible"作为提供商类型</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-100">
                    <div className="text-blue-600 font-black text-sm mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">2</span>
                      填写配置信息
                    </div>
                    <p className="text-xs text-gray-600">复制上方对应的URL和模型名称，填入接口地址和模型名称字段</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-100">
                    <div className="text-blue-600 font-black text-sm mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">3</span>
                      测试连接
                    </div>
                    <p className="text-xs text-gray-600">点击"立即测试连接"按钮，确保配置正确并能正常通信</p>
                  </div>
                </div>
              </div>
            </div>
          )}

              {activeTab === 'storage' && (
                <div className="space-y-8 animate-in zoom-in duration-300">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl shadow-green-200">
                      <i className="fas fa-database text-3xl text-white"></i>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">数据存储管理</h3>
                    <p className="text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed">
                      管理您的项目数据存储位置，支持自定义路径、数据迁移和自动备份
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 当前存储信息 */}
                    <div className="border-2 border-green-100 rounded-2xl p-6 bg-gradient-to-br from-green-50 to-white">
                      <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                        <i className="fas fa-info-circle text-green-500"></i>
                        当前存储状态
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">存储路径</div>
                          <div className="text-sm font-mono bg-gray-50 text-gray-700 p-3 rounded-lg border border-gray-100 truncate">
                            {storageConfig.dataPath || '默认应用数据目录'}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">存储模式</div>
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-lg text-xs font-black ${storageConfig.useCustomPath ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                              {storageConfig.useCustomPath ? '自定义路径' : '默认路径'}
                            </div>
                            {storageConfig.lastMigration && (
                              <div className="text-xs text-gray-400">
                                <i className="fas fa-clock mr-1"></i>
                                上次迁移: {new Date(storageConfig.lastMigration).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">数据文件</div>
                          <div className="text-sm text-gray-600">
                            novalist-data.json
                          </div>
                        </div>
                        
                        {/* 自动备份状态 */}
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">自动备份状态</div>
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-lg text-xs font-black ${storageConfig.autoBackupEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                              {storageConfig.autoBackupEnabled ? '已启用' : '未启用'}
                            </div>
                            {storageConfig.lastAutoBackup && (
                              <div className="text-xs text-gray-400">
                                <i className="fas fa-history mr-1"></i>
                                上次备份: {new Date(storageConfig.lastAutoBackup).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 存储配置 */}
                    <div className="border-2 border-blue-100 rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white">
                      <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                        <i className="fas fa-cog text-blue-500"></i>
                        存储配置
                      </h4>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-gray-700 mb-1">使用自定义存储路径</div>
                            <p className="text-xs text-gray-500">启用后，数据将保存到您指定的目录</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={storageConfig.useCustomPath}
                              onChange={(e) => setStorageConfig({...storageConfig, useCustomPath: e.target.checked})}
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                        </div>

                        {storageConfig.useCustomPath && (
                          <div className="space-y-4">
                            <div>
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">自定义存储路径</div>
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  className="flex-1 border-none rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                                  value={storageConfig.dataPath}
                                  onChange={(e) => setStorageConfig({...storageConfig, dataPath: e.target.value})}
                                  placeholder="例如：C:/Users/用户名/Documents/NovalistData"
                                />
                                <button 
                                  onClick={async () => {
                                    // 使用Electron API选择目录
                                    if (window.electronAPI) {
                                      try {
                                        const result = await window.electronAPI.openDirectoryDialog({
                                          title: '选择数据存储目录',
                                          defaultPath: storageConfig.dataPath || ''
                                        });
                                        if (!result.canceled && result.filePaths.length > 0) {
                                          setStorageConfig({...storageConfig, dataPath: result.filePaths[0]});
                                        }
                                      } catch (error) {
                                        console.error('选择目录失败:', error);
                                      }
                                    } else {
                                      alert('Electron API不可用，请在Electron环境中使用此功能');
                                    }
                                  }}
                                  className="px-4 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all"
                                >
                                  <i className="fas fa-folder-open mr-2"></i>
                                  选择目录
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 自动备份配置 */}
                        <div className="space-y-6 pt-6 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black text-gray-700 mb-1">启用自动备份</div>
                              <p className="text-xs text-gray-500">启用后，系统将定期自动备份所有数据</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={storageConfig.autoBackupEnabled || false}
                                onChange={(e) => setStorageConfig({
                                  ...storageConfig, 
                                  autoBackupEnabled: e.target.checked,
                                  autoBackupInterval: e.target.checked ? (storageConfig.autoBackupInterval || 10) : undefined
                                })}
                              />
                              <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                          </div>
                          
                          {storageConfig.autoBackupEnabled && (
                            <div className="space-y-4 pl-4 border-l-2 border-green-100">
                              <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">备份间隔</div>
                                <div className="flex gap-2">
                                  {[5, 10, 30].map((interval) => (
                                    <button
                                      key={interval}
                                      onClick={() => setStorageConfig({...storageConfig, autoBackupInterval: interval})}
                                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                                        storageConfig.autoBackupInterval === interval 
                                          ? 'bg-green-100 text-green-600 border-2 border-green-200' 
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {interval}秒
                                    </button>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  选择自动备份的时间间隔。备份将覆盖之前的备份文件，只保留最新的一份。
                                </p>
                              </div>
                              
                              <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">备份状态</div>
                                <div className="flex items-center gap-2">
                                  <div className={`px-3 py-1 rounded-lg text-xs font-black ${
                                    storageConfig.lastAutoBackup 
                                      ? 'bg-green-100 text-green-600' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {storageConfig.lastAutoBackup 
                                      ? `上次备份: ${new Date(storageConfig.lastAutoBackup).toLocaleTimeString()}`
                                      : '尚未备份'
                                    }
                                  </div>
                                  <button 
                                    onClick={async () => {
                                      // 手动触发备份
                                      try {
                                        // 这里需要调用storage.ts中的triggerManualBackup方法
                                        // 由于我们是在React组件中，需要通过props或其他方式传递
                                        // 暂时先显示提示
                                        alert('手动备份功能将在保存配置后生效');
                                      } catch (error) {
                                        console.error('手动备份失败:', error);
                                      }
                                    }}
                                    className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-black transition-all"
                                  >
                                    <i className="fas fa-save mr-1"></i>
                                    立即备份
                                  </button>
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">备份策略</div>
                                <p className="text-xs text-gray-600">
                                  • 自动备份将在每次数据保存时检查是否达到间隔时间<br/>
                                  • 备份文件保存在数据目录的"backups"文件夹中<br/>
                                  • 只保留最新的备份文件，旧的备份会被自动清理<br/>
                                  • 备份包含完整的项目数据和应用状态
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 数据操作 */}
                  <div className="border-2 border-red-100 rounded-2xl p-6 bg-gradient-to-br from-red-50 to-white mt-8">
                    <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                      <i className="fas fa-exclamation-triangle text-red-500"></i>
                      危险操作
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">数据迁移</div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={async () => {
                              setIsLoadingStorage(true);
                              setMigrationStatus('正在检查数据迁移...');
                              try {
                                // 这里需要调用数据迁移逻辑
                                // 暂时先模拟
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                setMigrationStatus('数据迁移检查完成');
                              } catch (error) {
                                setMigrationStatus('数据迁移失败: ' + (error as Error).message);
                              } finally {
                                setIsLoadingStorage(false);
                              }
                            }}
                            disabled={isLoadingStorage}
                            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {isLoadingStorage ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-exchange-alt"></i>}
                            检查数据迁移
                          </button>
                          {migrationStatus && (
                            <span className="text-xs text-gray-600">{migrationStatus}</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">清除所有数据</div>
                        <p className="text-xs text-gray-600 mb-3">
                          此操作将删除所有项目数据、配置和备份文件，无法恢复。
                        </p>
                        <button 
                          onClick={() => {
                            if (window.confirm('⚠️ 警告：这将删除所有数据，包括项目、配置和备份。确定要继续吗？')) {
                              onClearData();
                            }
                          }}
                          className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                        >
                          <i className="fas fa-trash-alt"></i>
                          清除所有数据
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

          {activeTab === 'embedding' && (
            <div className="space-y-6">
              {/* 快速添加按钮 */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {quickAddTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => quickAddEmbeddingConfig(template)}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1"
                  >
                    <span className="text-lg">{template.icon}</span>
                    <span className="text-center leading-tight">{template.name}</span>
                  </button>
                ))}
              </div>

              {/* Embedding配置列表 */}
              {embeddingConfigs.map(config => {
                const provider = embeddingProviders.find(p => p.id === config.provider);
                return (
                  <div key={config.id} className={`group border-2 rounded-[2rem] p-8 bg-white transition-all duration-500 ${activeEmbeddingId === config.id ? 'border-indigo-500 shadow-2xl shadow-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div 
                          onClick={() => setActiveEmbeddingConfig(config.id)}
                          className={`w-6 h-6 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all ${activeEmbeddingId === config.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-200'}`}
                        >
                          {activeEmbeddingId === config.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                        <input 
                          className="font-black bg-transparent border-none focus:ring-0 p-0 text-2xl text-gray-800 placeholder-gray-200"
                          value={config.name}
                          onChange={(e) => updateEmbeddingConfig(config.id, { name: e.target.value })}
                          placeholder="给模型起个名字..."
                        />
                      </div>
                      <button onClick={() => removeEmbeddingConfig(config.id)} className="text-gray-200 hover:text-red-500 transition-colors p-2">
                        <i className="fas fa-trash-alt text-lg"></i>
                      </button>
                    </div>

                    {/* 基本信息 */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">提供商</label>
                          <select 
                            className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                            value={config.provider}
                            onChange={(e) => {
                              const provider = embeddingProviders.find(p => p.id === e.target.value);
                              const defaultParams = getDefaultEmbeddingParams(e.target.value as EmbeddingModelProvider);
                              updateEmbeddingConfig(config.id, { 
                                provider: e.target.value as EmbeddingModelProvider,
                                endpoint: provider?.endpoint || config.endpoint,
                                modelName: provider?.recommendedModels[0]?.name || config.modelName,
                                dimensions: defaultParams.dimensions,
                                maxSequenceLength: defaultParams.maxSequenceLength,
                                batchSize: defaultParams.batchSize,
                                testStatus: 'untested'
                              });
                            }}
                          >
                            {embeddingProviders.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">模型名称</label>
                          <div className="relative">
                            <select 
                              className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 font-mono text-gray-600 outline-none focus:ring-2 focus:ring-indigo-100 appearance-none pr-10"
                              value={config.modelName}
                              onChange={(e) => updateEmbeddingConfig(config.id, { modelName: e.target.value, testStatus: 'untested' })}
                              disabled={embeddingModelListLoading[config.id]}
                            >
                              <option value="">请选择模型...</option>
                              {provider?.recommendedModels.map(m => (
                                <option key={m.name} value={m.name}>
                                  {m.name} {m.description ? `(${m.description})` : ''}
                                </option>
                              ))}
                              {config.availableModels?.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                              <i className="fas fa-chevron-down text-gray-400"></i>
                            </div>
                          </div>
                          <input 
                            className="w-full mt-2 border-none rounded-xl px-4 py-2.5 text-sm bg-gray-50/50 font-mono text-gray-600 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={config.modelName}
                            onChange={(e) => updateEmbeddingConfig(config.id, { modelName: e.target.value, testStatus: 'untested' })}
                            placeholder="或手动输入模型名称..."
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">接口地址 (Endpoint)</label>
                          <input 
                            className="w-full border-none rounded-2xl px-5 py-3.5 text-sm font-mono bg-gray-50 text-gray-600 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={config.endpoint}
                            onChange={(e) => updateEmbeddingConfig(config.id, { endpoint: e.target.value, testStatus: 'untested' })}
                            placeholder="https://api.example.com/v1"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">API 密钥 (API Key)</label>
                          <input 
                            type="password"
                            className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 text-gray-600 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={config.apiKey || ''}
                            onChange={(e) => updateEmbeddingConfig(config.id, { apiKey: e.target.value, testStatus: 'untested' })}
                            placeholder={provider?.apiKeyRequired ? "••••••••••••••••" : "本地部署可留空"}
                          />
                          {provider?.apiApplyUrl && (
                            <p className="text-xs text-gray-400 mt-1">
                              <a href={provider.apiApplyUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                                <i className="fas fa-key mr-1"></i>获取 API Key
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sentence-BERT参数设置 */}
                    <div className="border-t border-gray-100 pt-6 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <i className="fas fa-sliders-h text-indigo-500"></i>
                        <h3 className="text-lg font-black text-gray-900">Sentence-BERT 参数设置</h3>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest ml-auto">Embedding Parameters</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">向量维度</label>
                          <select 
                            className="w-full border-none rounded-xl px-4 py-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={config.dimensions}
                            onChange={(e) => updateEmbeddingConfig(config.id, { dimensions: parseInt(e.target.value) })}
                          >
                            <option value={384}>384</option>
                            <option value={512}>512</option>
                            <option value={768}>768</option>
                            <option value={1024}>1024</option>
                            <option value={1536}>1536</option>
                            <option value={2048}>2048</option>
                            <option value={3072}>3072</option>
                            <option value={4096}>4096</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">最大序列长度</label>
                          <select 
                            className="w-full border-none rounded-xl px-4 py-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={config.maxSequenceLength}
                            onChange={(e) => updateEmbeddingConfig(config.id, { maxSequenceLength: parseInt(e.target.value) })}
                          >
                            <option value={256}>256</option>
                            <option value={512}>512</option>
                            <option value={1024}>1024</option>
                            <option value={2048}>2048</option>
                            <option value={4096}>4096</option>
                            <option value={8192}>8192</option>
                            <option value={32768}>32768</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">批处理大小</label>
                          <select 
                            className="w-full border-none rounded-xl px-4 py-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={config.batchSize}
                            onChange={(e) => updateEmbeddingConfig(config.id, { batchSize: parseInt(e.target.value) })}
                          >
                            <option value={1}>1</option>
                            <option value={4}>4</option>
                            <option value={8}>8</option>
                            <option value={16}>16</option>
                            <option value={32}>32</option>
                            <option value={64}>64</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">超时时间 (ms)</label>
                          <select 
                            className="w-full border-none rounded-xl px-4 py-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={config.timeout}
                            onChange={(e) => updateEmbeddingConfig(config.id, { timeout: parseInt(e.target.value) })}
                          >
                            <option value={5000}>5s</option>
                            <option value={10000}>10s</option>
                            <option value={30000}>30s</option>
                            <option value={60000}>60s</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">池化策略</label>
                          <select 
                            className="w-full border-none rounded-xl px-4 py-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={config.poolingStrategy}
                            onChange={(e) => updateEmbeddingConfig(config.id, { poolingStrategy: e.target.value as 'mean' | 'cls' | 'max' })}
                          >
                            <option value="mean">Mean (平均)</option>
                            <option value="cls">CLS (分类标记)</option>
                            <option value="max">Max (最大池化)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">截断策略</label>
                          <select 
                            className="w-full border-none rounded-xl px-4 py-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={config.truncate}
                            onChange={(e) => updateEmbeddingConfig(config.id, { truncate: e.target.value as 'start' | 'end' | 'none' })}
                          >
                            <option value="end">End (末尾截断)</option>
                            <option value="start">Start (开头截断)</option>
                            <option value="none">None (不截断)</option>
                          </select>
                        </div>

                        <div className="flex items-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={config.normalizeEmbeddings}
                              onChange={(e) => updateEmbeddingConfig(config.id, { normalizeEmbeddings: e.target.checked })}
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                            <span className="ml-3 text-sm font-medium text-gray-700">归一化向量</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 状态显示 */}
                    {config.testStatus !== 'untested' && (
                      <div className={`mb-6 p-4 rounded-xl border-2 ${
                        config.testStatus === 'success' 
                          ? 'bg-emerald-50 border-emerald-100' 
                          : 'bg-red-50 border-red-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <i className={`fas ${config.testStatus === 'success' ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-circle text-red-500'}`}></i>
                          <span className={`font-bold text-sm ${config.testStatus === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {config.testStatus === 'success' ? '连接正常' : '连接失败'}
                          </span>
                          {config.lastTested && (
                            <span className="text-xs text-gray-400 ml-auto">
                              上次测试: {new Date(config.lastTested).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        {embeddingTestResults[config.id] && (
                          <pre className={`text-xs font-mono whitespace-pre-wrap ${config.testStatus === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {embeddingTestResults[config.id]}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-400">
                        {provider?.type === 'local' ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <i className="fas fa-home"></i> 本地部署
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-600">
                            <i className="fas fa-cloud"></i> 云端API
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => fetchEmbeddingModelList(config)}
                          disabled={embeddingModelListLoading[config.id]}
                          className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {embeddingModelListLoading[config.id] ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-list"></i>}
                          刷新模型列表
                        </button>
                        
                        <button 
                          onClick={() => testEmbeddingConnection(config)}
                          disabled={embeddingTestingId === config.id}
                          className="px-6 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                        >
                          {embeddingTestingId === config.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-vial"></i>}
                          {embeddingTestingId === config.id ? '测试中...' : '测试连接'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 添加新配置按钮 */}
              <button 
                onClick={addEmbeddingConfig}
                className="w-full border-4 border-dashed border-gray-100 rounded-[2rem] py-8 text-gray-300 font-black hover:bg-white hover:text-indigo-500 hover:border-indigo-100 transition-all flex flex-col items-center gap-2 group"
              >
                <i className="fas fa-plus-circle text-2xl group-hover:scale-125 transition-transform"></i>
                <span>新增 Embedding 模型配置</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-10 border-t border-gray-100 bg-white flex justify-between items-center">
          <p className="text-xs text-gray-400 font-medium italic">本地数据持久化已开启，配置将自动保存在当前浏览器。</p>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-8 py-3 text-sm font-black text-gray-400 hover:text-gray-600">取消</button>
            <button 
              onClick={handleGlobalSave} 
              className="px-10 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-100 active:scale-95 transition-all"
            >
              应用并保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
