/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 一致性检查提示词模板管理组件
 */

import React, { useState, useMemo } from 'react';
import { useTranslation, templateDisplayName, dt } from '@/i18n';
import { type ConsistencyCheckPromptTemplate, type ConsistencyCheckPromptCategory } from '../../../shared/types';
import { ConsistencyCheckPromptService } from './services/consistencyCheckPromptService';
import { getDefaultConsistencyPrompts } from '../../constants/consistencyCheck';
import { dialogService } from '@/shared/services/dialogService';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, Download, FileText, FlaskConical, Plus, Trash, Undo2, Upload, X } from 'lucide-react';


interface ConsistencyPromptManagerProps {
  templates: ConsistencyCheckPromptTemplate[];
  onTemplatesChange: (templates: ConsistencyCheckPromptTemplate[]) => void;
}

const ConsistencyPromptManager: React.FC<ConsistencyPromptManagerProps> = ({
  templates,
  onTemplatesChange
}) => {
  const { t } = useTranslation(['consistency', 'common']);
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
      name: t('consistency:pm.defaultTemplateName'),
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
      dialogService.alert(t('consistency:pm.defaultNoDelete'));
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
      // 副本转为自定义模板：烘焙当前语言显示名，清除内置键
      name: t('consistency:pm.duplicateSuffix', { name: templateDisplayName(template) }),
      nameKey: undefined,
      description: template.descriptionKey ? dt(template.descriptionKey) : template.description,
      descriptionKey: undefined,
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
    return { success: false, error: result.error || t('consistency:pm.importFailed') };
  };

  // 重置为默认
  const resetToDefault = async () => {
    if (await dialogService.confirm({ message: t('consistency:pm.resetConfirm'), danger: true })) {
      onTemplatesChange(getDefaultConsistencyPrompts());
      setEditingId(null);
      setTestResult(null);
    }
  };

  // 获取分类显示名
  const getCategoryName = (cat: ConsistencyCheckPromptCategory | 'all') => {
    if (cat === 'all') return t('consistency:pm.all');
    return t(`consistency:promptCategory.${cat}`);
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
          <h3 className="text-xl font-black text-gray-900">{t('consistency:pm.title')}</h3>
          <p className="text-xs text-gray-500 mt-1">{t('consistency:pm.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setImportExportMode('export'); setImportExportOpen(true); }}
            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <Download className="size-4" />{t('common:export')}
          </button>
          <button
            onClick={() => { setImportExportMode('import'); setImportExportOpen(true); }}
            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <Upload className="size-4" />{t('common:import')}
          </button>
          <button
            onClick={resetToDefault}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <Undo2 className="size-4" />{t('common:reset')}
          </button>
          <button
            onClick={addTemplate}
            className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <Plus className="size-4" />{t('consistency:pm.newTemplate')}
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
            <FileText className="size-10 mb-3" />
            <p>{t('consistency:pm.empty')}</p>
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
                    <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-lg">{t('consistency:pm.defaultBadge')}</span>
                  )}
                  <input
                    className="font-black bg-transparent border-none focus:ring-0 p-0 text-lg text-gray-800 w-48"
                    value={templateDisplayName(template)}
                    onChange={(e) => updateTemplate(template.id, { name: e.target.value, nameKey: undefined })}
                    placeholder={t('consistency:pm.namePlaceholder')}
                    disabled={template.isDefault}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => duplicateTemplate(template.id)}
                    className="text-gray-400 hover:text-blue-500 text-xs px-2 py-1"
                    title={t('consistency:pm.duplicateTitle')}
                  >
                    <Copy className="size-4" />
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={() => removeTemplate(template.id)}
                      className="text-gray-400 hover:text-red-500 text-xs px-2 py-1"
                      title={t('consistency:pm.deleteTitle')}
                    >
                      <Trash className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setEditingId(editingId === template.id ? null : template.id)}
                    className="text-gray-400 hover:text-rose-500 text-xs px-2 py-1"
                  >
                    {editingId === template.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </div>
              </div>

              {/* 模板基本信息 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('consistency:pm.categoryLabel')}</label>
                  <select
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none"
                    value={template.category}
                    onChange={(e) => updateTemplate(template.id, { category: e.target.value as ConsistencyCheckPromptCategory })}
                    disabled={template.isDefault}
                  >
                    {(['semantic_character', 'semantic_faction', 'semantic_location', 'semantic_timeline', 'semantic_cross', 'similarity_detection'] as ConsistencyCheckPromptCategory[]).map(cat => (
                      <option key={cat} value={cat}>{t(`consistency:promptCategory.${cat}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('consistency:pm.modesLabel')}</label>
                  <div className="text-sm text-gray-600 py-2">
                    {template.applicableModes.includes('ai') && `${t('consistency:pm.modeAi')} `}
                    {template.applicableModes.includes('vector') && t('consistency:pm.modeVector')}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('consistency:pm.variablesLabel')}</label>
                  <div className="text-sm text-gray-600 py-2">{t('consistency:pm.variablesCount', { count: template.variables?.length || 0 })}</div>
                </div>
              </div>

              {/* 展开编辑区域 */}
              {editingId === template.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {/* 描述 */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('consistency:pm.descLabel')}</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 bg-white outline-none"
                      value={template.descriptionKey ? dt(template.descriptionKey) : (template.description || '')}
                      onChange={(e) => updateTemplate(template.id, { description: e.target.value, descriptionKey: undefined })}
                      placeholder={t('consistency:pm.descPlaceholder')}
                      disabled={template.isDefault}
                    />
                  </div>

                  {/* 提示词内容 */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('consistency:pm.contentLabel')}</label>
                    <textarea
                      className="w-full h-48 border border-gray-200 rounded-2xl p-4 text-sm font-mono text-gray-600 bg-gray-50 outline-none resize-none"
                      value={template.content}
                      onChange={(e) => updateTemplate(template.id, { content: e.target.value })}
                      placeholder={t('consistency:pm.contentPlaceholder')}
                      disabled={template.isDefault}
                    />
                  </div>

                  {/* 可用变量提示 */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('consistency:pm.definedVarsLabel')}</label>
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
                        <FlaskConical className="size-4" />{t('consistency:pm.validateBtn')}
                      </button>
                      {testResult?.templateId === template.id && (
                        <div className={`text-xs ${testResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {testResult.isValid ? (
                            <span><CheckCircle2 className="size-4 mr-1" />{t('consistency:pm.validResult')}</span>
                          ) : (
                            <span><AlertCircle className="size-4 mr-1" />{testResult.errors.join(', ')}</span>
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
                {importExportMode === 'import' ? t('consistency:pm.importTitle') : t('consistency:pm.exportTitle')}
              </h3>
              <button
                onClick={() => { setImportExportOpen(false); setImportText(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6">
              {importExportMode === 'export' ? (
                <div>
                  <p className="text-sm text-gray-500 mb-4">{t('consistency:pm.exportHint')}</p>
                  <textarea
                    className="w-full h-64 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-600 bg-gray-50 resize-none"
                    value={exportTemplates()}
                    readOnly
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(exportTemplates()); dialogService.alert(t('consistency:pm.copied')); }}
                    className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all"
                  >
                    <Copy className="size-4 mr-2" />{t('consistency:pm.copyBtn')}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-4">{t('consistency:pm.importHint')}</p>
                  <textarea
                    className="w-full h-64 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-600 bg-gray-50 resize-none"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={t('consistency:pm.importPlaceholder')}
                  />
                  <button
                    onClick={() => {
                      const result = importTemplates(importText);
                      if (result.success) {
                        dialogService.alert(t('consistency:pm.importSuccess', { count: result.count ?? 0 }));
                        setImportExportOpen(false);
                        setImportText('');
                      } else {
                        dialogService.alert(result.error ?? t('consistency:pm.importFailed'));
                      }
                    }}
                    disabled={!importText.trim()}
                    className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl text-sm font-black hover:bg-green-700 transition-all disabled:bg-gray-300"
                  >
                    <Upload className="size-4 mr-2" />{t('consistency:pm.importBtn')}
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








