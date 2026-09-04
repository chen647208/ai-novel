/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import React from 'react';
import { useTranslation, dt } from '@/i18n';
import type { ModelSettingsPanelProps } from '../types';
import { modelProviders, findProviderPreset } from '../../../constants/modelProviders';
import { channelValueFor, channelPatch, channelGroups } from '../utils/channelPreset';
import { isModelConfigured } from '../../../shared/utils/modelReadiness';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Clock, FlaskConical, List, Loader2, PlusCircle, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react';


const CHANNEL_GROUPS = channelGroups(modelProviders);

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
  const { t, i18n } = useTranslation('settings');
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
                placeholder={t('models.namePlaceholder')}
              />
            </div>
            <button onClick={() => removeModel(model.id)} className="text-gray-200 hover:text-red-500 transition-colors p-2">
              <Trash2 className="size-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('models.channelLabel')}</label>
                <select
                  className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  value={channelValueFor(model)}
                  onChange={(e) => {
                    const preset = findProviderPreset(e.target.value);
                    if (preset) updateModel(model.id, channelPatch(preset, model));
                  }}
                >
                  {CHANNEL_GROUPS.map((group) => (
                    <optgroup key={group.id} label={t(group.labelKey)}>
                              {group.items.map((preset) => (
                                <option key={preset.id} value={preset.id}>{dt(preset.nameKey)}</option>
                              ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{(() => { const p = findProviderPreset(channelValueFor(model)); return p ? dt(p.descriptionKey) : ''; })()}</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('models.modelNameLabel')}</label>
                <div className="relative">
                  <select
                    className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 font-mono text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 appearance-none pr-10"
                    value={model.modelName}
                    onChange={(e) => updateModel(model.id, { modelName: e.target.value })}
                    disabled={modelListLoading[model.id]}
                  >
                    <option value="">{t('models.selectModelPlaceholder')}</option>
                    {model.availableModels && model.availableModels.length > 0 ? (
                      model.availableModels.map((modelName) => (
                        <option key={modelName} value={modelName}>
                          {modelName}
                        </option>
                      ))
                    ) : (
                      <option value={model.modelName || ''}>
                        {model.modelName || t('models.manualModelName')}
                      </option>
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="size-4 text-gray-400" />
                  </div>
                </div>

                {/* 模型列表状态显示 */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {modelListLoading[model.id] && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Loader2 className="size-4 animate-spin" />
                        <span>{t('models.fetchingList')}</span>
                      </div>
                    )}
                    {model.modelsFetchError && !modelListLoading[model.id] && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="size-4" />
                        <span>{model.modelsFetchError}</span>
                      </div>
                    )}
                    {model.availableModels && model.availableModels.length > 0 && !modelListLoading[model.id] && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="size-4" />
                        <span>{t('models.loadedCount', { count: model.availableModels.length })}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchModelList(model)}
                    disabled={modelListLoading[model.id] || !isModelConfigured(model)}
                    className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {modelListLoading[model.id] ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    {t('models.refreshList')}
                  </button>
                </div>

                {/* 手动输入备用 */}
                <div className="mt-2">
                  <input
                    className="w-full border-none rounded-xl px-4 py-2.5 text-sm bg-gray-50/50 font-mono text-gray-600 outline-none focus:ring-2 focus:ring-blue-100"
                    value={model.modelName}
                    onChange={(e) => updateModel(model.id, { modelName: e.target.value })}
                    placeholder={t('models.manualInputPlaceholder')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  {t('models.endpointLabel')}
                </label>
                <input
                  className="w-full border-none rounded-2xl px-5 py-3.5 text-sm font-mono bg-gray-50 text-gray-600 outline-none focus:ring-2 focus:ring-blue-100"
                  value={model.endpoint || ''}
                  onChange={(e) => updateModel(model.id, { endpoint: e.target.value })}
                  placeholder={
                    model.provider === 'gemini'
                      ? t('models.endpointPlaceholderGemini')
                      : model.provider === 'anthropic'
                        ? t('models.endpointPlaceholderAnthropic')
                        : 'https://api.example.com/v1'
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('models.apiKeyLabel')}</label>
                <input
                  type="password"
                  className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 text-gray-600 outline-none focus:ring-2 focus:ring-blue-100"
                  value={model.apiKey || ''}
                  onChange={(e) => updateModel(model.id, { apiKey: e.target.value })}
                  placeholder="••••••••••••••••"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t('models.apiKeyHint')}
                </p>
              </div>
            </div>
          </div>

          {/* 高级参数设置 */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <SlidersHorizontal className="size-4 text-blue-500" />
              <h3 className="text-lg font-black text-gray-900">{t('models.advancedTitle')}</h3>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest ml-auto">AI Model Parameters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 温度控制 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('models.temperatureLabel')}</label>
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
                    <span>{t('models.tempLow')}</span>
                    <span>{t('models.tempMid')}</span>
                    <span>{t('models.tempHigh')}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{t('models.temperatureHint')}</p>
              </div>

              {/* 最大令牌数 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('models.maxTokensLabel')}</label>
                  <span className="text-xs text-gray-400 font-bold">{t('models.optional')}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="8192"
                  className="w-full border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 font-mono text-gray-600 outline-none focus:ring-2 focus:ring-blue-100"
                  value={model.maxTokens || ''}
                  onChange={(e) => updateModel(model.id, { maxTokens: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder={t('models.maxTokensPlaceholder')}
                />
                <p className="text-xs text-gray-500">{t('models.maxTokensHint')}</p>
              </div>

              {/* 系统提示词 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('models.systemPromptLabel')}</label>
                  <span className="text-xs text-gray-400 font-bold">{t('models.optional')}</span>
                </div>
                <textarea
                  className="w-full h-24 border-none rounded-2xl px-5 py-3.5 text-sm bg-gray-50 text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                  value={model.systemPrompt || ''}
                  onChange={(e) => updateModel(model.id, { systemPrompt: e.target.value })}
                  placeholder={t('models.systemPromptPlaceholder')}
                />
                <p className="text-xs text-gray-500">{t('models.systemPromptHint')}</p>
              </div>

              {/* 流式输出支持 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {t('models.streamingLabel')}
                  </label>
                  <span className="text-xs text-gray-400 font-bold">{t('models.streamingRecommended')}</span>
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
                    {model.supportsStreaming !== false ? t('models.streamingOn') : t('models.streamingOff')}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t('models.streamingHint')}
                </p>
              </div>
            </div>
          </div>

          {testResults[model.id] && (
            <div className={`mt-8 p-6 rounded-2xl text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto border-2 ${
              testResults[model.id]?.startsWith('[ERROR]')
              ? 'bg-red-50 text-red-600 border-red-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {testResults[model.id]?.startsWith('[ERROR]') ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
                <span className="font-black uppercase tracking-widest">Connection Log</span>
              </div>
              {testResults[model.id]}
            </div>
          )}

          <div className="mt-6 flex justify-between items-center">
            <div className="text-xs text-gray-400">
              {model.modelsLastFetched && (
                <div className="flex items-center gap-1">
                  <Clock className="size-4" />
                  <span>{t('models.lastUpdated', { time: new Date(model.modelsLastFetched).toLocaleTimeString(i18n.language) })}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => fetchModelList(model)}
                disabled={modelListLoading[model.id] || !isModelConfigured(model)}
                className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modelListLoading[model.id] ? <Loader2 className="size-4 animate-spin" /> : <List className="size-4" />}
                {t('models.fetchList')}
              </button>

              <button
                onClick={() => testModel(model)}
                disabled={testingId === model.id}
                className="px-6 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black transition-all flex items-center gap-2"
              >
                {testingId === model.id ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
                {testingId === model.id ? t('models.testing') : t('models.testNow')}
              </button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={addModel} className="w-full border-4 border-dashed border-gray-100 rounded-[2rem] py-8 text-gray-300 font-black hover:bg-white hover:text-blue-500 hover:border-blue-100 transition-all flex flex-col items-center gap-2 group">
        <PlusCircle className="size-6 group-hover:scale-125 transition-transform" />
        <span>{t('models.addProvider')}</span>
      </button>
    </div>
  );
};

export default ModelSettingsPanel;
