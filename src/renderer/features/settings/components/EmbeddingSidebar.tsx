/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation } from '@/i18n';
import type { EmbeddingModelConfig } from '../../../../shared/types';
import { embeddingProviders } from '../../../constants/embeddingProviders';
import { cn } from '@/shared/utils/cn';
import { Input } from '@/shared/ui/Input';
import { AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { dt } from '@/i18n';

interface EmbeddingSidebarProps {
  configs: EmbeddingModelConfig[];
  selectedId: string | null;
  activeId: string | null;
  query: string;
  onQuery: (q: string) => void;
  onSelect: (id: string) => void;
  testResults: Record<string, string>;
}

function statusDot(config: EmbeddingModelConfig, result: string | undefined): React.ReactNode {
  if (result?.startsWith('[ERROR]') || config.testStatus === 'failed') {
    return <AlertCircle className="size-3.5 shrink-0 text-destructive" />;
  }
  if (config.testStatus === 'success') return <CheckCircle2 className="size-3.5 shrink-0 text-success" />;
  return <span className="size-2 shrink-0 rounded-full bg-muted-foreground/30" />;
}

/** 左侧向量配置列表：搜索 + 状态点 + 本地/云标识，一次只选一个在右侧编辑。 */
export const EmbeddingSidebar: React.FC<EmbeddingSidebarProps> = ({
  configs, selectedId, activeId, query, onQuery, onSelect, testResults,
}) => {
  const { t } = useTranslation('settings');
  return (
    <div className="flex w-60 shrink-0 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 text-xs"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t('models.searchPlaceholder', '搜索渠道 / 模型…')}
        />
      </div>
      <div className="custom-scrollbar -mx-1 flex-1 space-y-1 overflow-y-auto px-1 pb-1">
        {configs.map((config) => {
          const provider = embeddingProviders.find((p) => p.id === config.provider);
          const selected = selectedId === config.id;
          return (
            <button
              key={config.id}
              onClick={() => onSelect(config.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                selected ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-accent/50'
              )}
            >
              {statusDot(config, testResults[config.id])}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {config.name || t('models.namePlaceholder')}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {provider ? dt(provider.nameKey) : config.provider}
                  {provider?.type === 'local' ? ` · ${t('models.deploymentLocal')}` : ` · ${t('models.deploymentCloud')}`}
                  {config.id === activeId && ` · ${t('models.activeBadge')}`}
                </span>
              </span>
            </button>
          );
        })}
        {configs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            {t('models.emptyFilter', '没有匹配的渠道，换个关键词试试')}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmbeddingSidebar;
