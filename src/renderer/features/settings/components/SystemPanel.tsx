/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { AppWindow } from 'lucide-react';
import React from 'react';

import { useSettingsStore } from '@/app/stores/settingsStore';
import { useTranslation } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Label } from '@/shared/ui/Label';
import { Switch } from '@/shared/ui/Switch';

/** 系统壳设置（docs/design/15）：最小化到托盘 + 开机自启，直写 store 即下发主进程。 */
const SystemPanel: React.FC = () => {
  const { t } = useTranslation('settings');
  const minimizeToTray = useSettingsStore((s) => s.minimizeToTray !== false);
  const autoLaunch = useSettingsStore((s) => s.autoLaunch === true);
  const store = useSettingsStore.getState();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AppWindow className="size-4 text-muted-foreground" />
          {t('general.systemTitle')}
        </CardTitle>
        <CardDescription>{t('general.systemHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label>{t('general.minimizeToTray')}</Label>
            <p className="text-xs text-muted-foreground">{t('general.minimizeToTrayHint')}</p>
          </div>
          <Switch
            checked={minimizeToTray}
            onCheckedChange={(v) => store.setMinimizeToTray(v)}
            aria-label={t('general.minimizeToTray')}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label>{t('general.autoLaunch')}</Label>
            <p className="text-xs text-muted-foreground">{t('general.autoLaunchHint')}</p>
          </div>
          <Switch
            checked={autoLaunch}
            onCheckedChange={(v) => store.setAutoLaunch(v)}
            aria-label={t('general.autoLaunch')}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemPanel;
