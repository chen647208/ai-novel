import React from 'react';
import type { ModelProvider } from '../../../../shared/types';
import type { ModelSettingsPanelProps } from '../types';

const ModelSettingsPanel: React.FC<ModelSettingsPanelProps> = ({
  localModels,
  activeId,
  setActiveId,
  testingId,
  testResults,
  modelListLoading,
  removeModel,
  updateModel,
  testModel,
  fetchModelList,
  addModel,
}) => {
  return (
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
  );
};

export default ModelSettingsPanel;

