/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 界面功能开关面板：逐项开合可选界面入口；关闭即从界面移除，数据不受影响。 */
import { SlidersHorizontal } from 'lucide-react';
import React from 'react';

import { type FeatureLabelKey, setFeatureEnabled, TOGGLEABLE_FEATURES, type ToggleableFeatureId } from '@/app/featureToggles';
import { useFeatureEnabled } from '@/app/useFeatureToggles';
import { useTranslation } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Switch } from '@/shared/ui/Switch';

const FeatureToggleRow: React.FC<{ id: ToggleableFeatureId; labelKey: FeatureLabelKey }> = ({ id, labelKey }) => {
  const { t } = useTranslation('settings');
  const enabled = useFeatureEnabled(id);
  return (
    <label className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-foreground">{t(labelKey)}</span>
      <Switch checked={enabled} onCheckedChange={(checked) => setFeatureEnabled(id, checked)} aria-label={t(labelKey)} />
    </label>
  );
};

const FeatureTogglesPanel: React.FC = () => {
  const { t } = useTranslation('settings');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          {t('features.title')}
        </CardTitle>
        <CardDescription>{t('features.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {TOGGLEABLE_FEATURES.map((feature) => (
          <FeatureToggleRow key={feature.id} id={feature.id} labelKey={feature.labelKey} />
        ))}
      </CardContent>
    </Card>
  );
};

export default FeatureTogglesPanel;
