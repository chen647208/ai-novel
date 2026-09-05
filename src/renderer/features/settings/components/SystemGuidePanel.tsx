/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React from 'react';
import { useTranslation, dt, dtList } from '@/i18n';
import { modelProviders } from '../../../constants/modelProviders';
import type { SystemGuidePanelProps } from '../types';
import { Button } from '@/shared/ui/Button';
import { CheckCircle2, ExternalLink, GraduationCap, Key, Lightbulb, PlusCircle } from 'lucide-react';

const fieldLabel = 'mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground';

const SystemGuidePanel: React.FC<SystemGuidePanelProps> = ({ onQuickAddProviderModel }) => {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="size-7" />
        </div>
        <h3 className="font-serif text-xl font-medium text-foreground">{t('guide.title')}</h3>
        <p className="mx-auto mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t('guide.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {modelProviders.filter((provider) => provider.official).map((provider) => (
          <div
            key={provider.id}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4 className="flex items-center gap-2 font-serif text-base font-medium text-foreground">
                  {dt(provider.nameKey)}
                  {provider.isChinese && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      {t('guide.domestic')}
                    </span>
                  )}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">{dt(provider.descriptionKey)}</p>
              </div>
              <div className="text-right">
                <div className={fieldLabel}>{t('guide.recommendedModel')}</div>
                <div className="rounded border border-border bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
                  {provider.recommendedModels[0] ?? t('guide.custom')}
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-3">
              <div>
                <div className={fieldLabel}>{t('guide.website')}</div>
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  {provider.website.replace('https://', '')}
                </a>
              </div>
              <div>
                <div className={fieldLabel}>{t('guide.apiApplyUrl')}</div>
                <a
                  href={provider.apiApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <Key className="size-3.5" />
                  {t('guide.getApiKey')}
                </a>
              </div>
              <div>
                <div className={fieldLabel}>{t('guide.endpoint')}</div>
                <div className="rounded border border-border bg-muted/40 p-2 font-mono text-xs text-muted-foreground">
                  {provider.endpoint || t('guide.endpointDefault')}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className={fieldLabel}>{t('guide.tips')}</div>
              <ul className="space-y-1">
                {dtList(provider.tipsKey).map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex gap-2 border-t border-border pt-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => onQuickAddProviderModel(provider)}>
                <PlusCircle className="size-4" />
                {t('guide.quickAdd')}
              </Button>
              <a href={provider.website} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  <ExternalLink className="size-4" />
                  {t('guide.visitSite')}
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-5">
        <h4 className="mb-4 flex items-center gap-2 font-serif text-base font-medium text-foreground">
          <Lightbulb className="size-4 text-warning" />
          {t('guide.stepsTitle')}
        </h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular-nums text-primary">1</span>
              {t('guide.step1Title')}
            </div>
            <p className="text-xs text-muted-foreground">{t('guide.step1Desc')}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular-nums text-primary">2</span>
              {t('guide.step2Title')}
            </div>
            <p className="text-xs text-muted-foreground">{t('guide.step2Desc')}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular-nums text-primary">3</span>
              {t('guide.step3Title')}
            </div>
            <p className="text-xs text-muted-foreground">{t('guide.step3Desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemGuidePanel;
