/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { PlusCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { dt,useTranslation } from '@/i18n';

import { quickAddTemplates } from '../../../constants/embeddingProviders';
import type { EmbeddingSettingsPanelProps } from '../types';
import EmbeddingEditor from './EmbeddingEditor';
import EmbeddingSidebar from './EmbeddingSidebar';

/** 向量模型设置：顶部快捷添加 + 左侧列表 + 右侧单配置编辑，与 AI 渠道同一套交互。 */
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
  const { t } = useTranslation('settings');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(activeEmbeddingId ?? embeddingConfigs[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return embeddingConfigs;
    return embeddingConfigs.filter((c) => `${c.name} ${c.modelName} ${c.endpoint}`.toLowerCase().includes(q));
  }, [embeddingConfigs, query]);

  const selected = embeddingConfigs.find((c) => c.id === (selectedId ?? activeEmbeddingId ?? embeddingConfigs[0]?.id)) ?? filtered[0] ?? embeddingConfigs[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {quickAddTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => quickAddEmbeddingConfig(template)}
            className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
          >
            <template.Icon className="size-5 text-primary/80" strokeWidth={1.75} />
            <span className="text-center leading-tight">{dt(template.nameKey)}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        <EmbeddingSidebar
          configs={filtered}
          selectedId={selected?.id ?? null}
          activeId={activeEmbeddingId}
          query={query}
          onQuery={setQuery}
          onSelect={setSelectedId}
          testResults={embeddingTestResults}
        />
        <div className="min-w-0 flex-1 space-y-5">
          {selected ? (
            <EmbeddingEditor
              config={selected}
              active={activeEmbeddingId === selected.id}
              testing={embeddingTestingId === selected.id}
              testResult={embeddingTestResults[selected.id]}
              listLoading={Boolean(embeddingModelListLoading[selected.id])}
              onSetActive={() => { setActiveEmbeddingConfig(selected.id); setSelectedId(selected.id); }}
              onRemove={() => removeEmbeddingConfig(selected.id)}
              onUpdate={(updates) => updateEmbeddingConfig(selected.id, updates)}
              onTest={() => testEmbeddingConnection(selected)}
              onFetchList={() => fetchEmbeddingModelList(selected)}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {t('models.emptyAll', '还没有渠道，先添加一个')}
            </div>
          )}
          <button
            onClick={addEmbeddingConfig}
            className="group flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/30 hover:text-primary"
          >
            <PlusCircle className="size-5 transition-transform group-hover:scale-110" />
            <span>{t('embedding.addConfig')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmbeddingSettingsPanel;
