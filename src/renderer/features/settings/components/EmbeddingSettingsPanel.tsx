import React from 'react';
import { embeddingProviders, quickAddTemplates, getDefaultEmbeddingParams } from '../../../constants/embeddingProviders';
import type { EmbeddingModelProvider } from '../../../../shared/types';
import type { EmbeddingSettingsPanelProps } from '../types';

const EmbeddingSettingsPanel: React.FC<EmbeddingSettingsPanelProps> = ({
  embeddingConfigs,
  activeEmbeddingId,
  embeddingTestingId,
  embeddingTestResults,
  embeddingModelListLoading,
  addEmbeddingConfig,
  removeEmbeddingConfig,
  updateEmbeddingConfig,
  testEmbeddingConnection,
  fetchEmbeddingModelList,
  setActiveEmbeddingConfig,
  quickAddEmbeddingConfig,
}) => {
  return (
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
  );
};

export default EmbeddingSettingsPanel;

