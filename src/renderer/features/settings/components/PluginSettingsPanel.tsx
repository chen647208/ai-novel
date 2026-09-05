/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 插件状态面板（docs/design/04 §2）：状态汇总 + 错误详情 + 一键禁用/启用。 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { pluginHostPromise, saveDisabledList } from '@/features/assistant/services/aiRuntime';
import type { PluginStatus } from '@core/plugin';

const PluginSettingsPanel: React.FC = () => {
  const { t } = useTranslation('settings');
  const [statuses, setStatuses] = useState<PluginStatus[] | null>(null);

  useEffect(() => {
    let alive = true;
    void pluginHostPromise.then((host) => {
      if (alive) setStatuses(host.list());
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggle = (id: string, disabled: boolean): void => {
    void pluginHostPromise.then((host) => {
      if (disabled) {
        host.enable(id);
        host.activate(id);
      } else {
        host.disable(id);
      }
      saveDisabledList(host.list().filter((st) => st.state === 'disabled').map((st) => st.id));
      setStatuses(host.list());
    });
  };

  if (statuses === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const failed = statuses.filter((s) => s.state === 'failed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-medium">{t('plugins.title')}</h3>
        <Badge variant="secondary">{statuses.length}</Badge>
        {failed > 0 && <Badge variant="destructive">{t('plugins.failedCount', { count: failed })}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">{t('plugins.description')}</p>

      {!statuses.length && <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">{t('plugins.empty')}</div>}

      <div className="space-y-2">
        {statuses.map((s) => (
          <div key={s.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{s.id}</span>
                  <Badge variant={s.state === 'active' ? 'default' : s.state === 'failed' ? 'destructive' : 'secondary'}>
                    {t(`plugins.state.${s.state}`)}
                  </Badge>
                </div>
                {s.error && <div className="mt-1 text-xs text-destructive">{s.error.phase}: {s.error.message}</div>}
                {s.error && s.error.cause.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">cause: {s.error.cause.join(' ← ')}</div>
                )}
              </div>
              {s.state === 'disabled' ? (
                <Button size="sm" variant="outline" onClick={() => toggle(s.id, true)}>
                  {t('plugins.enable')}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => toggle(s.id, false)}>
                  {t('plugins.disable')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PluginSettingsPanel;
