/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation, templateDisplayName } from '@/i18n';
import type { CardPromptCategory } from '../../../../shared/types';
import { getTemplateVariableDescriptions } from '../../cards/services/cardPromptService';
import type { CardPromptSettingsPanelProps } from '../types';
import { dialogService } from '@/shared/services/dialogService';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, Download, FlaskConical, Plus, Trash, Undo2, Upload, X } from 'lucide-react';


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
  const { t } = useTranslation(['settings', 'common']);
  return (
    <div className="space-y-6">
      {/* 标题和操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-gray-900">{t('cardPrompts.title')}</h3>
          <p className="text-xs text-gray-500 mt-1">{t('cardPrompts.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setImportExportMode('export');
              setImportExportModalOpen(true);
            }}
            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <Download className="size-4" />
            {t('common:export')}
          </button>
          <button
            onClick={() => {
              setImportExportMode('import');
              setImportExportModalOpen(true);
            }}
            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <Upload className="size-4" />
            {t('common:import')}
          </button>
          <button
            onClick={resetCardPromptsToDefault}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <Undo2 className="size-4" />
            {t('common:reset')}
          </button>
          <button
            onClick={addCardPrompt}
            className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <Plus className="size-4" />
            {t('cardPrompts.newTemplate')}
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
                    {t('cardPrompts.defaultBadge')}
                  </span>
                )}
                <input
                  className="font-black bg-transparent border-none focus:ring-0 p-0 text-lg text-gray-800 w-48"
                  value={templateDisplayName(template)}
                  onChange={(e) => updateCardPrompt(template.id, { name: e.target.value, nameKey: undefined })}
                  placeholder={t('cardPrompts.namePlaceholder')}
                  disabled={template.isDefault}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => duplicateCardPrompt(template.id)}
                  className="text-gray-400 hover:text-blue-500 text-xs px-2 py-1"
                  title={t('cardPrompts.duplicateTip')}
                >
                  <Copy className="size-4" />
                </button>
                {!template.isDefault && (
                  <button
                    onClick={() => removeCardPrompt(template.id)}
                    className="text-gray-400 hover:text-red-500 text-xs px-2 py-1"
                    title={t('cardPrompts.deleteTip')}
                  >
                    <Trash className="size-4" />
                  </button>
                )}
                <button
                  onClick={() => setEditingCardPromptId(editingCardPromptId === template.id ? null : template.id)}
                  className="text-gray-400 hover:text-amber-500 text-xs px-2 py-1"
                  title={editingCardPromptId === template.id ? t('cardPrompts.collapse') : t('cardPrompts.edit')}
                >
                  {editingCardPromptId === template.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>
            </div>

            {/* 模板基本信息 */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('cardPrompts.categoryLabel')}</label>
                <select
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-100"
                  value={template.category}
                  onChange={(e) => updateCardPrompt(template.id, { category: e.target.value as CardPromptCategory })}
                  disabled={template.isDefault}
                >
                  <option value="card-character">{t('cardPrompts.category.character')}</option>
                  <option value="card-location">{t('cardPrompts.category.location')}</option>
                  <option value="card-faction">{t('cardPrompts.category.faction')}</option>
                  <option value="card-timeline">{t('cardPrompts.category.timeline')}</option>
                  <option value="card-rule">{t('cardPrompts.category.rule')}</option>
                  <option value="card-magic">{t('cardPrompts.category.magic')}</option>
                  <option value="card-tech">{t('cardPrompts.category.tech')}</option>
                  <option value="card-history">{t('cardPrompts.category.history')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('cardPrompts.requiredCountLabel')}</label>
                <div className="text-sm text-gray-600 py-2">{t('cardPrompts.fieldsCount', { count: template.requiredFields?.length || 0 })}</div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('cardPrompts.variablesLabel')}</label>
                <div className="text-sm text-gray-600 py-2">{t('cardPrompts.variablesCount', { count: template.variables?.length || 0 })}</div>
              </div>
            </div>

            {/* 展开编辑区域 */}
            {editingCardPromptId === template.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in">
                {/* 提示词内容 */}
                <div className="mb-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    {t('cardPrompts.contentLabel')}
                    <span className="text-gray-300 font-normal ml-2">{t('cardPrompts.mustIncludeVar')}</span>
                  </label>
                  <textarea
                    className="w-full h-48 border border-gray-200 rounded-2xl p-4 text-sm font-mono text-gray-600 bg-gray-50 outline-none focus:ring-2 focus:ring-amber-100 resize-none custom-scrollbar"
                    value={template.content}
                    onChange={(e) => updateCardPrompt(template.id, { content: e.target.value })}
                    placeholder={t('cardPrompts.contentPlaceholder')}
                    disabled={template.isDefault}
                  />
                </div>

                {/* 必填字段配置 */}
                <div className="mb-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('cardPrompts.requiredFieldsLabel')}</label>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-2">
                      {t('cardPrompts.requiredFieldsHint')}
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('cardPrompts.variablesLabel')}</label>
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
                      <FlaskConical className="size-4" />
                      {t('cardPrompts.validate')}
                    </button>
                    {cardPromptTestResult?.templateId === template.id && (
                      <div className={`text-xs ${cardPromptTestResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {cardPromptTestResult.isValid ? (
                          <span><CheckCircle2 className="size-4 mr-1" />{t('cardPrompts.valid')}</span>
                        ) : (
                          <span><AlertCircle className="size-4 mr-1" />{cardPromptTestResult.errors.join(', ')}</span>
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
                {importExportMode === 'import' ? t('cardPrompts.importTitle') : t('cardPrompts.exportTitle')}
              </h3>
              <button
                onClick={() => {
                  setImportExportModalOpen(false);
                  setImportText('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6">
              {importExportMode === 'export' ? (
                <div>
                  <p className="text-sm text-gray-500 mb-4">{t('cardPrompts.exportHint')}</p>
                  <textarea
                    className="w-full h-64 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-600 bg-gray-50 resize-none"
                    value={exportCardPrompts()}
                    readOnly
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(exportCardPrompts());
                      dialogService.alert(t('cardPrompts.copied'));
                    }}
                    className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all"
                  >
                    <Copy className="size-4 mr-2" />{t('cardPrompts.copyToClipboard')}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-4">{t('cardPrompts.importHint')}</p>
                  <textarea
                    className="w-full h-64 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-600 bg-gray-50 resize-none"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={t('cardPrompts.pastePlaceholder')}
                  />
                  <button
                    onClick={() => {
                      const result = importCardPrompts(importText);
                      if (result.success) {
                        dialogService.alert(t('cardPrompts.importSuccess', { count: result.count ?? 0 }));
                        setImportExportModalOpen(false);
                        setImportText('');
                      } else {
                        dialogService.alert(result.error ?? t('cardPrompts.importFailed'));
                      }
                    }}
                    disabled={!importText.trim()}
                    className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl text-sm font-black hover:bg-green-700 transition-all disabled:bg-gray-300"
                  >
                    <Upload className="size-4 mr-2" />{t('cardPrompts.importTitle')}
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
