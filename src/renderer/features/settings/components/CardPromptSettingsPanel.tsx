import React from 'react';
import type { CardPromptCategory } from '../../../../shared/types';
import { getTemplateVariableDescriptions } from '../../cards/services/cardPromptService';
import type { CardPromptSettingsPanelProps } from '../types';

const CardPromptSettingsPanel: React.FC<CardPromptSettingsPanelProps> = ({
  localCardPrompts,
  editingCardPromptId,
  setEditingCardPromptId,
  cardPromptTestResult,
  importExportModalOpen,
  setImportExportModalOpen,
  importExportMode,
  setImportExportMode,
  importText,
  setImportText,
  addCardPrompt,
  removeCardPrompt,
  updateCardPrompt,
  duplicateCardPrompt,
  testCardPrompt,
  exportCardPrompts,
  importCardPrompts,
  resetCardPromptsToDefault,
}) => {
  return (
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
  );
};

export default CardPromptSettingsPanel;

