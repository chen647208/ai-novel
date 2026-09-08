/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useState } from 'react';
import { useTranslation, dt } from '@/i18n';
import { embeddingProviders, getDefaultEmbeddingParams } from '../../../constants/embeddingProviders';
import type { EmbeddingModelProvider, EmbeddingModelConfig } from '../../../../shared/types';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { cn } from '@/shared/utils/cn';
import { AlertCircle, CheckCircle2, Cloud, Eye, EyeOff, FlaskConical, Home, Key, List, SlidersHorizontal, Trash2 } from 'lucide-react';

const fieldLabel = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground';
const hintText = 'mt-1.5 text-xs text-muted-foreground';

interface EmbeddingEditorProps {
  config: EmbeddingModelConfig;
  active: boolean;
  testing: boolean;
  testResult: string | undefined;
  listLoading: boolean;
  onSetActive: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<EmbeddingModelConfig>) => void;
  onTest: () => void;
  onFetchList: () => void;
}

/** 右侧单向量配置编辑器：基本信息常显，Sentence-BERT 参数折叠进高级区，Key 支持显隐。 */
export const EmbeddingEditor: React.FC<EmbeddingEditorProps> = ({
  config, active, testing, testResult, listLoading, onSetActive, onRemove, onUpdate, onTest, onFetchList,
}) => {
  const { t, i18n } = useTranslation('settings');
  const [showKey, setShowKey] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const provider = embeddingProviders.find((p) => p.id === config.provider);

  return (
    <div className={cn('min-w-0 flex-1 rounded-lg border bg-card p-6', active ? 'border-primary/40' : 'border-border')}>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            role="radio"
            aria-checked={active}
            tabIndex={0}
            onClick={onSetActive}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onSetActive(); } }}
            className={cn('flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2', active ? 'border-primary' : 'border-input')}
          >
            {active && <span className="size-2 rounded-full bg-primary" />}
          </span>
          <input
            className="w-56 min-w-0 border-none bg-transparent p-0 font-serif text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
            value={config.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={t('models.namePlaceholder')}
          />
          {active && (
            <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-primary">
              {t('models.activeBadge')}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onRemove} title={t('models.deleteTitle')}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className={fieldLabel}>{t('embedding.providerLabel')}</label>
            <Select
              value={config.provider}
              onChange={(e) => {
                const next = embeddingProviders.find((p) => p.id === e.target.value);
                const defaultParams = getDefaultEmbeddingParams(e.target.value as EmbeddingModelProvider);
                onUpdate({
                  provider: e.target.value as EmbeddingModelProvider,
                  endpoint: next?.endpoint || config.endpoint,
                  modelName: next?.recommendedModels[0]?.name || config.modelName,
                  dimensions: defaultParams.dimensions,
                  maxSequenceLength: defaultParams.maxSequenceLength,
                  batchSize: defaultParams.batchSize,
                  testStatus: 'untested',
                });
              }}
            >
              <optgroup label={t('embedding.providerGroups.custom')}>
                {embeddingProviders.filter((p) => p.id === 'openai-compatible').map((p) => (
                  <option key={p.id} value={p.id}>{dt(p.nameKey)}</option>
                ))}
              </optgroup>
              <optgroup label={t('embedding.providerGroups.local')}>
                {embeddingProviders.filter((p) => p.type === 'local').map((p) => (
                  <option key={p.id} value={p.id}>{dt(p.nameKey)}</option>
                ))}
              </optgroup>
              <optgroup label={t('embedding.providerGroups.cloud')}>
                {embeddingProviders.filter((p) => p.type === 'cloud' && p.id !== 'openai-compatible').map((p) => (
                  <option key={p.id} value={p.id}>{dt(p.nameKey)}</option>
                ))}
              </optgroup>
            </Select>
            {provider && <p className={hintText}>{dt(provider.descriptionKey)}</p>}
          </div>
          <div>
            <label className={fieldLabel}>{t('embedding.modelNameLabel')}</label>
            <Select
              value={config.modelName}
              onChange={(e) => onUpdate({ modelName: e.target.value, testStatus: 'untested' })}
              disabled={listLoading}
              className="font-mono"
            >
              <option value="">{t('models.selectModelPlaceholder')}</option>
              {provider?.recommendedModels.map((m) => (
                <option key={m.name} value={m.name}>{m.name}{m.descriptionKey ? ` (${dt(m.descriptionKey)})` : ''}</option>
              ))}
              {config.availableModels?.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
            <Input
              className="mt-2 font-mono text-xs"
              value={config.modelName}
              onChange={(e) => onUpdate({ modelName: e.target.value, testStatus: 'untested' })}
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
              onChange={(e) => onUpdate({ endpoint: e.target.value, testStatus: 'untested' })}
              placeholder="https://api.example.com/v1"
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('models.apiKeyLabel')}</label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey || ''}
                onChange={(e) => onUpdate({ apiKey: e.target.value, testStatus: 'untested' })}
                placeholder={provider?.apiKeyRequired ? '••••••••••••••••' : t('embedding.localCanLeaveBlank')}
                className="pr-9 font-mono"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showKey ? t('models.hideKey', '隐藏') : t('models.showKey', '显示')}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
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

      <div className="border-t border-border pt-5">
        <button type="button" onClick={() => setAdvancedOpen((v) => !v)} className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">{t('embedding.paramsTitle')}</h3>
          <span className="text-xs text-muted-foreground">{advancedOpen ? '▾' : '▸'}</span>
        </button>
        {advancedOpen && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className={fieldLabel}>{t('embedding.dimensionsLabel')}</label>
              <Select value={config.dimensions} onChange={(e) => onUpdate({ dimensions: parseInt(e.target.value, 10) })}>
                {[384, 512, 768, 1024, 1536, 2048, 3072, 4096].map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div>
              <label className={fieldLabel}>{t('embedding.maxSeqLabel')}</label>
              <Select value={config.maxSequenceLength} onChange={(e) => onUpdate({ maxSequenceLength: parseInt(e.target.value, 10) })}>
                {[256, 512, 1024, 2048, 4096, 8192, 32768].map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div>
              <label className={fieldLabel}>{t('embedding.batchLabel')}</label>
              <Select value={config.batchSize} onChange={(e) => onUpdate({ batchSize: parseInt(e.target.value, 10) })}>
                {[1, 4, 8, 16, 32, 64].map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div>
              <label className={fieldLabel}>{t('embedding.timeoutLabel')}</label>
              <Select value={config.timeout} onChange={(e) => onUpdate({ timeout: parseInt(e.target.value, 10) })}>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>60s</option>
              </Select>
            </div>
            <div>
              <label className={fieldLabel}>{t('embedding.poolingLabel')}</label>
              <Select value={config.poolingStrategy} onChange={(e) => onUpdate({ poolingStrategy: e.target.value as 'mean' | 'cls' | 'max' })}>
                <option value="mean">{t('embedding.poolMean')}</option>
                <option value="cls">{t('embedding.poolCls')}</option>
                <option value="max">{t('embedding.poolMax')}</option>
              </Select>
            </div>
            <div>
              <label className={fieldLabel}>{t('embedding.truncateLabel')}</label>
              <Select value={config.truncate} onChange={(e) => onUpdate({ truncate: e.target.value as 'start' | 'end' | 'none' })}>
                <option value="end">{t('embedding.truncEnd')}</option>
                <option value="start">{t('embedding.truncStart')}</option>
                <option value="none">{t('embedding.truncNone')}</option>
              </Select>
            </div>
            <div>
              <label className={fieldLabel}>{t('embedding.chunkSizeLabel')}</label>
              <Select
                value={config.chunkSize ?? 0}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  onUpdate({ chunkSize: v > 0 ? v : undefined });
                }}
              >
                <option value={0}>{t('embedding.chunkSizeAuto')}</option>
                {[500, 1000, 2000, 4000, 8000].map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div>
              <label className={fieldLabel}>{t('embedding.chunkOverlapLabel')}</label>
              <Select
                value={config.chunkOverlap ?? 0}
                onChange={(e) => onUpdate({ chunkOverlap: parseInt(e.target.value, 10) })}
              >
                {[0, 50, 100, 200, 500].map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div className="flex items-center">
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={config.normalizeEmbeddings} onChange={(e) => onUpdate({ normalizeEmbeddings: e.target.checked })} />
                <span className="h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-background after:shadow after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5" />
                <span className="ml-3 text-sm text-foreground">{t('embedding.normalizeLabel')}</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {config.testStatus !== 'untested' && (
        <div className={cn('mt-6 rounded-lg border p-4', config.testStatus === 'success' ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5')}>
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
          {testResult && (
            <pre className={cn('whitespace-pre-wrap font-mono text-xs', config.testStatus === 'success' ? 'text-success' : 'text-destructive')}>{testResult}</pre>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="text-xs">
          {provider?.type === 'local' ? (
            <span className="flex items-center gap-1 text-success"><Home className="size-3.5" /> {t('embedding.localDeploy')}</span>
          ) : (
            <span className="flex items-center gap-1 text-primary"><Cloud className="size-3.5" /> {t('embedding.cloudApi')}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onFetchList} disabled={listLoading}>
            {listLoading ? <Spinner className="size-4" /> : <List className="size-4" />}
            {t('models.refreshList')}
          </Button>
          <Button variant="default" size="sm" onClick={onTest} disabled={testing}>
            {testing ? <Spinner className="size-4" /> : <FlaskConical className="size-4" />}
            {testing ? t('embedding.testing') : t('embedding.testConn')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmbeddingEditor;
