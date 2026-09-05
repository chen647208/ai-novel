/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation, dt } from '@/i18n';
import { embeddingProviders, quickAddTemplates, getDefaultEmbeddingParams } from '../../../constants/embeddingProviders';
import type { EmbeddingModelProvider } from '../../../../shared/types';
import type { EmbeddingSettingsPanelProps } from '../types';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { cn } from '@/shared/utils/cn';
import { AlertCircle, CheckCircle2, Cloud, FlaskConical, Home, Key, List, Loader2, PlusCircle, SlidersHorizontal, Trash2 } from 'lucide-react';

const fieldLabel = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground';

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
  const { t, i18n } = useTranslation('settings');
  return (
    <div className="space-y-5">
      {/* 快速添加按钮 */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {quickAddTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => quickAddEmbeddingConfig(template)}
            className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
          >
            <span className="text-lg leading-none">{template.icon}</span>
            <span className="text-center leading-tight">{dt(template.nameKey)}</span>
          </button>
        ))}
      </div>

      {/* Embedding配置列表 */}
      {embeddingConfigs.map(config => {
        const provider = embeddingProviders.find(p => p.id === config.provider);
        const active = activeEmbeddingId === config.id;
        return (
          <div key={config.id} className={cn('rounded-lg border bg-card p-6 transition-colors', active ? 'border-primary/40' : 'border-border')}>
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  role="radio"
                  aria-checked={active}
                  tabIndex={0}
                  onClick={() => setActiveEmbeddingConfig(config.id)}
                  onKeyDown={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      setActiveEmbeddingConfig(config.id);
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
                  value={config.name}
                  onChange={(e) => updateEmbeddingConfig(config.id, { name: e.target.value })}
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
                onClick={() => removeEmbeddingConfig(config.id)}
                title={t('models.deleteTitle')}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {/* 基本信息 */}
            <div className="mb-6 grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className={fieldLabel}>{t('embedding.providerLabel')}</label>
                  <Select
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
                        {dt(p.nameKey)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className={fieldLabel}>{t('embedding.modelNameLabel')}</label>
                  <Select
                    value={config.modelName}
                    onChange={(e) => updateEmbeddingConfig(config.id, { modelName: e.target.value, testStatus: 'untested' })}
                    disabled={embeddingModelListLoading[config.id]}
                    className="font-mono"
                  >
                    <option value="">{t('models.selectModelPlaceholder')}</option>
                    {provider?.recommendedModels.map(m => (
                      <option key={m.name} value={m.name}>
                        {m.name}{m.descriptionKey ? ` (${dt(m.descriptionKey)})` : ''}
                      </option>
                    ))}
                    {config.availableModels?.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </Select>
                  <Input
                    className="mt-2 font-mono text-xs"
                    value={config.modelName}
                    onChange={(e) => updateEmbeddingConfig(config.id, { modelName: e.target.value, testStatus: 'untested' })}
                    placeholder={t('models.manualInputPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={fieldLabel}>{t('models.endpointLabel')}</label>
                  <Input
                    className="font-mono"
                    value={config.endpoint}
                    onChange={(e) => updateEmbeddingConfig(config.id, { endpoint: e.target.value, testStatus: 'untested' })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>

                <div>
                  <label className={fieldLabel}>{t('models.apiKeyLabel')}</label>
                  <Input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={(e) => updateEmbeddingConfig(config.id, { apiKey: e.target.value, testStatus: 'untested' })}
                    placeholder={provider?.apiKeyRequired ? "••••••••••••••••" : t('embedding.localCanLeaveBlank')}
                  />
                  {provider?.apiApplyUrl && (
                    <p className="mt-1.5 text-xs">
                      <a href={provider.apiApplyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                        <Key className="size-3.5" />{t('guide.getApiKey')}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sentence-BERT参数设置 */}
            <div className="mb-6 border-t border-border pt-5">
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">{t('embedding.paramsTitle')}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <label className={fieldLabel}>{t('embedding.dimensionsLabel')}</label>
                  <Select value={config.dimensions} onChange={(e) => updateEmbeddingConfig(config.id, { dimensions: parseInt(e.target.value, 10) })}>
                    <option value={384}>384</option>
                    <option value={512}>512</option>
                    <option value={768}>768</option>
                    <option value={1024}>1024</option>
                    <option value={1536}>1536</option>
                    <option value={2048}>2048</option>
                    <option value={3072}>3072</option>
                    <option value={4096}>4096</option>
                  </Select>
                </div>

                <div>
                  <label className={fieldLabel}>{t('embedding.maxSeqLabel')}</label>
                  <Select value={config.maxSequenceLength} onChange={(e) => updateEmbeddingConfig(config.id, { maxSequenceLength: parseInt(e.target.value, 10) })}>
                    <option value={256}>256</option>
                    <option value={512}>512</option>
                    <option value={1024}>1024</option>
                    <option value={2048}>2048</option>
                    <option value={4096}>4096</option>
                    <option value={8192}>8192</option>
                    <option value={32768}>32768</option>
                  </Select>
                </div>

                <div>
                  <label className={fieldLabel}>{t('embedding.batchLabel')}</label>
                  <Select value={config.batchSize} onChange={(e) => updateEmbeddingConfig(config.id, { batchSize: parseInt(e.target.value, 10) })}>
                    <option value={1}>1</option>
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                    <option value={32}>32</option>
                    <option value={64}>64</option>
                  </Select>
                </div>

                <div>
                  <label className={fieldLabel}>{t('embedding.timeoutLabel')}</label>
                  <Select value={config.timeout} onChange={(e) => updateEmbeddingConfig(config.id, { timeout: parseInt(e.target.value, 10) })}>
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                    <option value={60000}>60s</option>
                  </Select>
                </div>

                <div>
                  <label className={fieldLabel}>{t('embedding.poolingLabel')}</label>
                  <Select value={config.poolingStrategy} onChange={(e) => updateEmbeddingConfig(config.id, { poolingStrategy: e.target.value as 'mean' | 'cls' | 'max' })}>
                    <option value="mean">{t('embedding.poolMean')}</option>
                    <option value="cls">{t('embedding.poolCls')}</option>
                    <option value="max">{t('embedding.poolMax')}</option>
                  </Select>
                </div>

                <div>
                  <label className={fieldLabel}>{t('embedding.truncateLabel')}</label>
                  <Select value={config.truncate} onChange={(e) => updateEmbeddingConfig(config.id, { truncate: e.target.value as 'start' | 'end' | 'none' })}>
                    <option value="end">{t('embedding.truncEnd')}</option>
                    <option value="start">{t('embedding.truncStart')}</option>
                    <option value="none">{t('embedding.truncNone')}</option>
                  </Select>
                </div>

                <div className="flex items-center">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={config.normalizeEmbeddings}
                      onChange={(e) => updateEmbeddingConfig(config.id, { normalizeEmbeddings: e.target.checked })}
                    />
                    <span className="h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-background after:shadow after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5" />
                    <span className="ml-3 text-sm text-foreground">{t('embedding.normalizeLabel')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 状态显示 */}
            {config.testStatus !== 'untested' && (
              <div className={cn(
                'mb-6 rounded-lg border p-4',
                config.testStatus === 'success' ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'
              )}>
                <div className="mb-1 flex items-center gap-2">
                  {config.testStatus === 'success' ? <CheckCircle2 className="size-4 text-success" /> : <AlertCircle className="size-4 text-destructive" />}
                  <span className={cn('text-sm font-medium', config.testStatus === 'success' ? 'text-success' : 'text-destructive')}>
                    {config.testStatus === 'success' ? t('embedding.statusOk') : t('embedding.statusFail')}
                  </span>
                  {config.lastTested && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {t('embedding.lastTested', { time: new Date(config.lastTested).toLocaleTimeString(i18n.language) })}
                    </span>
                  )}
                </div>
                {embeddingTestResults[config.id] && (
                  <pre className={cn('whitespace-pre-wrap font-mono text-xs', config.testStatus === 'success' ? 'text-success' : 'text-destructive')}>
                    {embeddingTestResults[config.id]}
                  </pre>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="text-xs">
                {provider?.type === 'local' ? (
                  <span className="flex items-center gap-1 text-success">
                    <Home className="size-3.5" /> {t('embedding.localDeploy')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-primary">
                    <Cloud className="size-3.5" /> {t('embedding.cloudApi')}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchEmbeddingModelList(config)}
                  disabled={embeddingModelListLoading[config.id]}
                >
                  {embeddingModelListLoading[config.id] ? <Loader2 className="size-4 animate-spin" /> : <List className="size-4" />}
                  {t('models.refreshList')}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => testEmbeddingConnection(config)}
                  disabled={embeddingTestingId === config.id}
                >
                  {embeddingTestingId === config.id ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
                  {embeddingTestingId === config.id ? t('embedding.testing') : t('embedding.testConn')}
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {/* 添加新配置按钮 */}
      <button
        onClick={addEmbeddingConfig}
        className="group flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/30 hover:text-primary"
      >
        <PlusCircle className="size-5 transition-transform group-hover:scale-110" />
        <span>{t('embedding.addConfig')}</span>
      </button>
    </div>
  );
};

export default EmbeddingSettingsPanel;
