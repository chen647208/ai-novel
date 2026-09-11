/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useMemo, useState } from 'react';

import { useSettingsStore } from '@/app/stores/settingsStore';
import { useTranslation } from '@/i18n';
import { clearUsage, getHourlyLimit, setHourlyLimit, summarize } from '@/shared/services/ai/usageTracker';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';

const RANGES = [
  { id: 'today', ms: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); } },
  { id: '7d', ms: () => Date.now() - 7 * 86400_000 },
  { id: '30d', ms: () => Date.now() - 30 * 86400_000 },
  { id: 'all', ms: () => 0 },
] as const;

/** 用量与费用卡片（参考 CC Switch 用量可见性）：按模型聚合 token 与估算费用。 */
const UsageSummaryCard: React.FC = () => {
  const { t } = useTranslation('settings');
  const models = useSettingsStore((s) => s.models);
  const [rangeId, setRangeId] = useState<string>('7d');
  const [tick, setTick] = useState(0);
  const [hourlyLimit, setHourlyLimitState] = useState<number>(() => getHourlyLimit());

  const summary = useMemo(() => {
    const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[1];
    return summarize(range.ms(), (id) => models.find((m) => m.id === id));
  }, [rangeId, models, tick]);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium text-foreground">{t('usage.title')}</h4>
        <div className="flex items-center gap-2">
          <Select value={rangeId} onChange={(e) => setRangeId(e.target.value)} aria-label={t('usage.rangeLabel')} className="h-7 w-auto text-xs">
            <option value="today">{t('usage.rangeToday')}</option>
            <option value="7d">{t('usage.range7d')}</option>
            <option value="30d">{t('usage.range30d')}</option>
            <option value="all">{t('usage.rangeAll')}</option>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setTick((v) => v + 1)}>{t('usage.refresh')}</Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { clearUsage(); setTick((v) => v + 1); }}>{t('usage.clear')}</Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>{t('usage.requests', { count: summary.requests })}</span>
        <span>{t('usage.input', { count: summary.prompt })}</span>
        <span>{t('usage.output', { count: summary.completion })}</span>
        <span className="font-medium text-foreground">
          {summary.priced ? t('usage.cost', { cost: summary.costUsd.toFixed(4) }) : t('usage.costUnknown')}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{t('usage.hourlyLimitLabel')}</span>
        <Input
          type="number" min={0} className="h-7 w-24 text-xs"
          value={hourlyLimit || ''}
          placeholder={t('usage.unlimited')}
          onChange={(e) => { const v = e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value))); setHourlyLimit(v); setHourlyLimitState(v); }}
        />
        <span>{t('usage.hourlyLimitHint')}</span>
      </div>

      {summary.rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('usage.empty')}</p>
      ) : (
        <div className="space-y-1">
          {summary.rows.map((row) => (
            <div key={row.modelId} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate" title={row.modelName}>{row.modelName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.requests} · {row.prompt}/{row.completion}
                {summary.priced && ` · $${row.costUsd.toFixed(4)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UsageSummaryCard;
