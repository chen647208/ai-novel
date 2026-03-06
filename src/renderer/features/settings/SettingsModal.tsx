import React, { useEffect, useState } from 'react';
import type { ModelProviderInfo } from '../../constants/modelProviders';
import {
  CardPromptTemplate,
  ConsistencyCheckPromptTemplate,
  EmbeddingModelConfig,
  ModelConfig,
  PromptTemplate,
  StorageConfig,
} from '../../../shared/types';
import { AIService } from '../assistant/services/aiService';
import { ModelListService } from './services/modelListService';
import { storage } from '../../shared/services/storage';
import { embeddingModelService } from './services/embeddingModelService';
import { quickAddTemplates } from '../../constants/embeddingProviders';
import { getDefaultCardPrompts, validateCardPromptTemplate } from '../cards/services/cardPromptService';
import { DEFAULT_IMPORT_EXPORT_MODE, DEFAULT_SETTINGS_TAB, DEFAULT_STORAGE_CONFIG } from './constants';
import SettingsModalHeader from './components/SettingsModalHeader';
import SettingsModalFooter from './components/SettingsModalFooter';
import SettingsTabContent from './components/SettingsTabContent';
import {
  createDefaultEmbeddingConfig,
  createNewCardPromptTemplate,
  createNewModelConfig,
  createNewPromptTemplate,
  createQuickAddEmbeddingConfig,
  duplicateCardPromptTemplate,
  importCardPromptTemplates,
} from './factories';
import type {
  CardPromptTestResult,
  EmbeddingQuickAddTemplate,
  ImportExportMode,
  SettingsModalProps,
  SettingsTab,
} from './types';

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  models, 
  activeModelId, 
  prompts, 
  cardPrompts = [],
  consistencyPrompts = [],
  onSaveModels, 
  onSavePrompts,
  onSaveCardPrompts,
  onSaveConsistencyPrompts,
  onClose,
  onClearData
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(DEFAULT_SETTINGS_TAB);
  const [localModels, setLocalModels] = useState<ModelConfig[]>(models);
  const [activeId, setActiveId] = useState<string | null>(activeModelId);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const [localPrompts, setLocalPrompts] = useState<PromptTemplate[]>(prompts);
  // 模型列表获取状态
  const [modelListLoading, setModelListLoading] = useState<Record<string, boolean>>({});

  // 存储配置状态
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(DEFAULT_STORAGE_CONFIG);
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
  const [cardPromptTestResult, setCardPromptTestResult] = useState<CardPromptTestResult | null>(null);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<ImportExportMode>(DEFAULT_IMPORT_EXPORT_MODE);
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
    const newModel = createNewModelConfig();
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
    const newPrompt = createNewPromptTemplate();
    setLocalPrompts([...localPrompts, newPrompt]);
  };

  const updatePrompt = (id: string, updates: Partial<PromptTemplate>) => {
    setLocalPrompts(localPrompts.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  // Embedding配置处理函数
  const addEmbeddingConfig = () => {
    const newConfig = createDefaultEmbeddingConfig();
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

  const quickAddEmbeddingConfig = (template: EmbeddingQuickAddTemplate) => {
    const newConfig = createQuickAddEmbeddingConfig(template);
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
    const newPrompt = createNewCardPromptTemplate();
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

    const newPrompt = duplicateCardPromptTemplate(prompt);
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
    const result = importCardPromptTemplates(jsonString, validateCardPromptTemplate);
    if (!result.success) {
      return result;
    }

    setLocalCardPrompts([...localCardPrompts, ...(result.prompts || [])]);
    return { success: true, count: result.count };
  };

  const resetCardPromptsToDefault = () => {
    if (confirm('确定要重置所有自定义模板吗？这将删除所有自定义模板并恢复默认模板。')) {
      setLocalCardPrompts(getDefaultCardPrompts());
      setEditingCardPromptId(null);
      setCardPromptTestResult(null);
    }
  };




  const quickAddProviderModel = (provider: ModelProviderInfo) => {
    const newModel: ModelConfig = {
      id: Date.now().toString(),
      name: `${provider.name}配置`,
      provider: 'openai-compatible',
      endpoint: provider.openaiCompatibleUrl,
      modelName: provider.modelExamples[0],
    };

    setLocalModels((currentModels) => [...currentModels, newModel]);
    setActiveId(newModel.id);
    setActiveTab('models');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        <SettingsModalHeader
          activeTab={activeTab}
          onChange={setActiveTab}
          onClose={onClose}
        />
        <div className="p-10 overflow-y-auto flex-1 bg-gray-50/50 custom-scrollbar">
          <SettingsTabContent
            activeTab={activeTab}
            localModels={localModels}
            activeId={activeId}
            setActiveId={setActiveId}
            testingId={testingId}
            testResults={testResults}
            modelListLoading={modelListLoading}
            removeModel={removeModel}
            updateModel={updateModel}
            testModel={testModel}
            fetchModelList={fetchModelList}
            addModel={addModel}
            localPrompts={localPrompts}
            setLocalPrompts={setLocalPrompts}
            updatePrompt={updatePrompt}
            addPrompt={addPrompt}
            localCardPrompts={localCardPrompts}
            editingCardPromptId={editingCardPromptId}
            setEditingCardPromptId={setEditingCardPromptId}
            cardPromptTestResult={cardPromptTestResult}
            importExportModalOpen={importExportModalOpen}
            setImportExportModalOpen={setImportExportModalOpen}
            importExportMode={importExportMode}
            setImportExportMode={setImportExportMode}
            importText={importText}
            setImportText={setImportText}
            addCardPrompt={addCardPrompt}
            removeCardPrompt={removeCardPrompt}
            updateCardPrompt={updateCardPrompt}
            duplicateCardPrompt={duplicateCardPrompt}
            testCardPrompt={testCardPrompt}
            exportCardPrompts={exportCardPrompts}
            importCardPrompts={importCardPrompts}
            resetCardPromptsToDefault={resetCardPromptsToDefault}
            localConsistencyPrompts={localConsistencyPrompts}
            setLocalConsistencyPrompts={setLocalConsistencyPrompts}
            quickAddProviderModel={quickAddProviderModel}
            storageConfig={storageConfig}
            setStorageConfig={setStorageConfig}
            isLoadingStorage={isLoadingStorage}
            setIsLoadingStorage={setIsLoadingStorage}
            migrationStatus={migrationStatus}
            setMigrationStatus={setMigrationStatus}
            onClearData={onClearData}
            embeddingConfigs={embeddingConfigs}
            activeEmbeddingId={activeEmbeddingId}
            embeddingTestingId={embeddingTestingId}
            embeddingTestResults={embeddingTestResults}
            embeddingModelListLoading={embeddingModelListLoading}
            addEmbeddingConfig={addEmbeddingConfig}
            removeEmbeddingConfig={removeEmbeddingConfig}
            updateEmbeddingConfig={updateEmbeddingConfig}
            testEmbeddingConnection={testEmbeddingConnection}
            fetchEmbeddingModelList={fetchEmbeddingModelList}
            setActiveEmbeddingConfig={setActiveEmbeddingConfig}
            quickAddEmbeddingConfig={quickAddEmbeddingConfig}
          />
        </div>

        <SettingsModalFooter
          onClose={onClose}
          onSave={handleGlobalSave}
        />
      </div>
    </div>
  );
};

export default SettingsModal;








