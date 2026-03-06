/**
 * 一致性检查提示词模板管理组件
 */

import React, { useState, useMemo } from 'react';
import { ConsistencyCheckPromptTemplate, ConsistencyCheckPromptCategory } from '../types';
import { ConsistencyCheckPromptService } from '../services/consistencyCheckPromptService';
import { getDefaultConsistencyPrompts } from '../constants/consistencyCheck';

interface ConsistencyPromptManagerProps {
  templates: ConsistencyCheckPromptTemplate[];
  onTemplatesChange: (templates: ConsistencyCheckPromptTemplate[]) => void;
}

const ConsistencyPromptManager: React.FC<ConsistencyPromptManagerProps> = ({
  templates,
  onTemplatesChange
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ templateId: string; isValid: boolean; errors: string[] } | null>(null);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export');
  const [importText, setImportText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ConsistencyCheckPromptCategory | 'all'>('all');

  // 过滤后的模板
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return templates;
    return templates.filter(t => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  // 添加新模板
  const addTemplate = () => {
    const newTemplate: ConsistencyCheckPromptTemplate = {
      id: Date.now().toString(),
      category: 'semantic_character',
      name: '新检查模板',
      content: '请检查以下内容的语义一致性：\n\n【项目】{projectTitle}\n【世界观】{worldView}\n\n【待检查内容】\n{targetData}\n\n请检查是否存在矛盾或不一致之处。',
      variables: ['projectTitle', 'worldView', 'targetData'],
      isDefault: false,
      applicableModes: ['ai'],
      tags: []
    };
    onTemplatesChange([...templates, newTemplate]);
    setEditingId(newTemplate.id);
  };

  // 删除模板
  const removeTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template?.isDefault) {
      alert('默认模板不能删除');
      return;
    }
    onTemplatesChange(templates.filter(t => t.id !== id));
    if (editingId === id) setEditingId(null);
  };

  // 更新模板
  const updateTemplate = (id: string, updates: Partial<ConsistencyCheckPromptTemplate>) => {
    onTemplatesChange(templates.map(t => t.id === id ? { ...t, ...updates } : t));
    if (testResult?.templateId === id) setTestResult(null);
  };

  // 复制模板
  const duplicateTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    
    const newTemplate: ConsistencyCheckPromptTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (副本)`,
      isDefault: false
    };
    onTemplatesChange([...templates, newTemplate]);
    setEditingId(newTemplate.id);
  };

  // 测试模板
  const testTemplate = (template: ConsistencyCheckPromptTemplate) => {
    const result = ConsistencyCheckPromptService.validateTemplate(template);
    setTestResult({
      templateId: template.id,
      isValid: result.isValid,
      errors: result.errors
    });
    return result.isValid;
  };

  // 导出模板
  const exportTemplates = () => {
    return ConsistencyCheckPromptService.exportTemplates(templates);
  };

  // 导入模板
  const importTemplates = (jsonString: string) => {
    const result = ConsistencyCheckPromptService.importTemplates(jsonString);
    if (result.success && result.templates) {
      onTemplatesChange([...templates, ...result.templates]);
      return { success: true, count: result.templates.length };
    }
    return { success: false, error: result.error || '导入失败' };
  };

  // 重置为默认
  const resetToDefault = () => {
    if (confirm('确定要重置所有自定义模板吗？这将删除所有自定义模板并恢复默认模板。')) {
      onTemplatesChange(getDefaultConsistencyPrompts());
      setEditingId(null);
      setTestResult(null);
    }
  };

  // 获取分类显示名
  const getCategoryName = (cat: ConsistencyCheckPromptCategory | 'all') => {
    if (cat === 'all') return '全部';
    return ConsistencyCheckPromptService.getCategoryDisplayName(cat);
  };

  const categories: (ConsistencyCheckPromptCategory | 'all')[] = [
    'all', 'semantic_character', 'semantic_faction', 'semantic_location', 
    'semantic_timeline', 'semantic_cross', 'similarity_detection'
  ];

  return (
    <div className="space-y-6">
      {/* 标题和操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-gray-900">一致性检查提示词模板</h3>
          <p className="text-xs text-gray-500 mt-1">自定义AI语义检查和向量相似度检测使用的提示词模板</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setImportExportMode('export'); setImportExportOpen(true); }}
            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <i className="fas fa-download"></i>导出
          </button>
          <button
            onClick={() => { setImportExportMode('import'); setImportExportOpen(true); }}
            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <i className="fas fa-upload"></i>导入
          </button>
          <button
            onClick={resetToDefault}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <i className="fas fa-undo"></i>重置
          </button>
          <button
            onClick={addTemplate}
            className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>新建模板
          </button>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              selectedCategory === cat 
                ? 'bg-rose-100 text-rose-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {getCategoryName(cat)}
          </button>
        ))}
      </div>

      {/* 模板列表 */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-file-alt text-4xl mb-3"></i>
            <p>暂无模板</p>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div 
              key={template.id} 
              className={`border-2 rounded-[2rem] p-6 bg-white transition-all ${
                editingId === template.id ? 'border-rose-300 shadow-xl shadow-rose-50' : 'border-gray-100 hover:border-rose-100'
              } ${template.isDefault ? 'bg-rose-50/30' : ''}`}
            >
              {/* 模板头部 */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {template.isDefault && (
                    <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-lg">默认模板</span>
                  )}
                  <input
                    className="font-black bg-transparent border-none focus:ring-0 p-0 text-lg text-gray-800 w-48"
                    value={template.name}
                    onChange={(e) => updateTemplate(template.id, { name: e.target.value })}
                    placeholder="模板名称"
                    disabled={template.isDefault}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => duplicateTemplate(template.id)}
                    className="text-gray-400 hover:text-blue-500 text-xs px-2 py-1"
                    title="复制模板"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={() => removeTemplate(template.id)}
                      className="text-gray-400 hover:text-red-500 text-xs px-2 py-1"
                      title="删除模板"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                  <button
                    onClick={() => setEditingId(editingId === template.id ? null : template.id)}
                    className="text-gray-400 hover:text-rose-500 text-xs px-2 py-1"
                  >
                    <i className={`fas fa-chevron-${editingId === template.id ? 'up' : 'down'}`}></i>
                  </button>
                </div>
              </div>

              {/* 模板基本信息 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">模板分类</label>
                  <select
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none"
                    value={template.category}
                    onChange={(e) => updateTemplate(template.id, { category: e.target.value as ConsistencyCheckPromptCategory })}
                    disabled={template.isDefault}
                  >
                    <option value="semantic_character">角色语义检查</option>
                    <option value="semantic_faction">势力语义检查</option>
                    <option value="semantic_location">地点语义检查</option>
                    <option value="semantic_timeline">时间线逻辑检查</option>
                    <option value="semantic_cross">跨引用一致性检查</option>
                    <option value="similarity_detection">相似度检测</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">适用模式</label>
                  <div className="text-sm text-gray-600 py-2">
                    {template.applicableModes.includes('ai') && 'AI检查 '}
                    {template.applicableModes.includes('vector') && '向量检测'}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">可用变量</label>
                  <div className="text-sm text-gray-600 py-2">{template.variables?.length || 0} 个变量</div>
                </div>
              </div>

              {/* 展开编辑区域 */}
              {editingId === template.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {/* 描述 */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">模板描述</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 bg-white outline-none"
                      value={template.description || ''}
                      onChange={(e) => updateTemplate(template.id, { description: e.target.value })}
                      placeholder="描述此模板的用途..."
                      disabled={template.isDefault}
                    />
                  </div>

                  {/* 提示词内容 */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">提示词内容</label>
                    <textarea
                      className="w-full h-48 border border-gray-200 rounded-2xl p-4 text-sm font-mono text-gray-600 bg-gray-50 outline-none resize-none"
                      value={template.content}
                      onChange={(e) => updateTemplate(template.id, { content: e.target.value })}
                      placeholder="在此输入提示词模板内容..."
                      disabled={template.isDefault}
                    />
                  </div>

                  {/* 可用变量提示 */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">已定义变量</label>
                    <div className="flex flex-wrap gap-2">
                      {template.variables?.map(v => (
                        <span key={v} className="px-2 py-1 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700">
                          {'{' + v + '}'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 测试按钮和结果 */}
                  {!template.isDefault && (
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => testTemplate(template)}
                        className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-vial"></i>验证模板
                      </button>
                      {testResult?.templateId === template.id && (
                        <div className={`text-xs ${testResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {testResult.isValid ? (
                            <span><i className="fas fa-check-circle mr-1"></i>模板有效</span>
                          ) : (
                            <span><i className="fas fa-exclamation-circle mr-1"></i>{testResult.errors.join(', ')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 导入/导出模态框 */}
      {importExportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900">
                {importExportMode === 'import' ? '导入模板' : '导出模板'}
              </h3>
              <button
                onClick={() => { setImportExportOpen(false); setImportText(''); }}
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
                    value={exportTemplates()}
                    readOnly
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(exportTemplates()); alert('已复制到剪贴板'); }}
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
                      const result = importTemplates(importText);
                      if (result.success) {
                        alert(`成功导入 ${result.count} 个模板`);
                        setImportExportOpen(false);
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

export default ConsistencyPromptManager;
