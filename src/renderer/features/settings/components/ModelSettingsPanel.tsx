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
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { cn } from '@/shared/utils/cn';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, FlaskConical, List, Loader2, PlusCircle, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react';

const CHANNEL_GROUPS = channelGroups(modelProviders);

const fieldLabel = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground';
const hintText = 'mt-1.5 text-xs text-muted-foreground';

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
    <div className="space-y-5">
      {localModels.map(model => {
        const active = activeId === model.id;
        return (
          <div key={model.id} className={cn('rounded-lg border bg-card p-6 transition-colors', active ? 'border-primary/40' : 'border-border')}>
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  role="radio"
                  aria-checked={active}
                  tabIndex={0}
                  onClick={() => setActiveId(model.id)}
                  onKeyDown={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      setActiveId(model.id);
                    }
                  }}
                  className={cn(
                    'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors',
                    active ? 'border-primary' : 'border-input'
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <input
                  className="w-64 border-none bg-transparent p-0 font-serif text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
                  value={model.name}
                  onChange={(e) => updateModel(model.id, { name: e.target.value })}
                  placeholder={t('models.namePlaceholder')}
                />
                {active && (
                  <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    {t('models.activeBadge')}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeModel(model.id)}
                title={t('models.deleteTitle')}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className={fieldLabel}>{t('models.channelLabel')}</label>
                  <Select
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
                  </Select>
                  <p className={hintText}>{(() => { const p = findProviderPreset(channelValueFor(model)); return p ? dt(p.descriptionKey) : ''; })()}</p>
                </div>
                <div>
                  <label className={fieldLabel}>{t('models.modelNameLabel')}</label>
                  <Select
                    value={model.modelName}
                    onChange={(e) => updateModel(model.id, { modelName: e.target.value })}
                    disabled={modelListLoading[model.id]}
                    className="font-mono"
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
                  </Select>

                  {/* 模型列表状态显示 */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {modelListLoading[model.id] && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Loader2 className="size-4 animate-spin" />
                          <span>{t('models.fetchingList')}</span>
                        </div>
                      )}
                      {model.modelsFetchError && !modelListLoading[model.id] && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="size-4" />
                          <span>{model.modelsFetchError}</span>
                        </div>
                      )}
                      {model.availableModels && model.availableModels.length > 0 && !modelListLoading[model.id] && (
                        <div className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="size-4" />
                          <span>{t('models.loadedCount', { count: model.availableModels.length })}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => fetchModelList(model)}
                      disabled={modelListLoading[model.id] || !isModelConfigured(model)}
                    >
                      {modelListLoading[model.id] ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                      {t('models.refreshList')}
                    </Button>
                  </div>

                  {/* 手动输入备用 */}
                  <div className="mt-2">
                    <Input
                      className="font-mono text-xs"
                      value={model.modelName}
                      onChange={(e) => updateModel(model.id, { modelName: e.target.value })}
                      placeholder={t('models.manualInputPlaceholder')}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={fieldLabel}>{t('models.endpointLabel')}</label>
                  <Input
                    className="font-mono"
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
                  <label className={fieldLabel}>{t('models.apiKeyLabel')}</label>
                  <Input
                    type="password"
                    value={model.apiKey || ''}
                    onChange={(e) => updateModel(model.id, { apiKey: e.target.value })}
                    placeholder="••••••••••••••••"
                  />
                  <p className={hintText}>{t('models.apiKeyHint')}</p>
                </div>
              </div>
            </div>

            {/* 高级参数设置 */}
            <div className="mt-6 border-t border-border pt-5">
              <div className="mb-5 flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">{t('models.advancedTitle')}</h3>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* 温度控制 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('models.temperatureLabel')}</label>
                    <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-xs tabular-nums text-foreground">
                      {model.temperature !== undefined ? model.temperature.toFixed(1) : '0.7'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.1"
                      className="w-full accent-primary"
                      value={model.temperature !== undefined ? model.temperature : 0.7}
                      onChange={(e) => updateModel(model.id, { temperature: parseFloat(e.target.value) })}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t('models.tempLow')}</span>
                      <span>{t('models.tempMid')}</span>
                      <span>{t('models.tempHigh')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('models.temperatureHint')}</p>
                </div>

                {/* 最大令牌数 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('models.maxTokensLabel')}</label>
                    <span className="text-xs text-muted-foreground">{t('models.optional')}</span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="8192"
                    className="font-mono"
                    value={model.maxTokens || ''}
                    onChange={(e) => updateModel(model.id, { maxTokens: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                    placeholder={t('models.maxTokensPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('models.maxTokensHint')}</p>
                </div>

                {/* 系统提示词 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('models.systemPromptLabel')}</label>
                    <span className="text-xs text-muted-foreground">{t('models.optional')}</span>
                  </div>
                  <Textarea
                    className="min-h-[96px] text-sm"
                    value={model.systemPrompt || ''}
                    onChange={(e) => updateModel(model.id, { systemPrompt: e.target.value })}
                    placeholder={t('models.systemPromptPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('models.systemPromptHint')}</p>
                </div>

                {/* 流式输出支持 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t('models.streamingLabel')}
                    </label>
                    <span className="text-xs text-muted-foreground">{t('models.streamingRecommended')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={model.supportsStreaming !== false}
                        onChange={(e) => updateModel(model.id, {
                          supportsStreaming: e.target.checked
                        })}
                      />
                      <span className="h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-background after:shadow after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5" />
                    </label>
                    <span className="text-sm text-foreground">
                      {model.supportsStreaming !== false ? t('models.streamingOn') : t('models.streamingOff')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('models.streamingHint')}
                  </p>
                </div>
              </div>
            </div>

            {testResults[model.id] && (
              <div className={cn(
                'custom-scrollbar mt-5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border p-4 font-mono text-[11px] leading-relaxed',
                testResults[model.id]?.startsWith('[ERROR]')
                  ? 'border-destructive/20 bg-destructive/5 text-destructive'
                  : 'border-success/20 bg-success/5 text-success'
              )}>
                <div className="mb-2 flex items-center gap-2 font-medium uppercase tracking-wider">
                  {testResults[model.id]?.startsWith('[ERROR]') ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
                  <span>{t('models.connectionLog')}</span>
                </div>
                {testResults[model.id]}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <div className="text-xs text-muted-foreground">
                {model.modelsLastFetched && (
                  <div className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    <span>{t('models.lastUpdated', { time: new Date(model.modelsLastFetched).toLocaleTimeString(i18n.language) })}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchModelList(model)}
                  disabled={modelListLoading[model.id] || !isModelConfigured(model)}
                >
                  {modelListLoading[model.id] ? <Loader2 className="size-4 animate-spin" /> : <List className="size-4" />}
                  {t('models.fetchList')}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => testModel(model)}
                  disabled={testingId === model.id}
                >
                  {testingId === model.id ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
                  {testingId === model.id ? t('models.testing') : t('models.testNow')}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      <button
        onClick={addModel}
        className="group flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/30 hover:text-primary"
      >
        <PlusCircle className="size-5 transition-transform group-hover:scale-110" />
        <span>{t('models.addProvider')}</span>
      </button>
    </div>
  );
};

export default ModelSettingsPanel;
