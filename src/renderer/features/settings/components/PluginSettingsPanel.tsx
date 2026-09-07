/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 插件状态面板（docs/design/04 §2）：状态汇总 + 错误详情 + 一键禁用/启用。 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { pluginHostPromise, saveDisabledList, eventBus } from '@/features/assistant/services/aiRuntime';
import { PROFILE_CHANGED_EVENT, assemblyTree, type AssemblyRow, type Disposable as PluginDisposable, type PluginStatus } from '@core/plugin';

const PluginSettingsPanel: React.FC = () => {
  const { t } = useTranslation('settings');
  const [statuses, setStatuses] = useState<PluginStatus[] | null>(null);
  const [tree, setTree] = useState<AssemblyRow[] | null>(null);
  const [profile, setProfile] = useState<string>(() => localStorage.getItem('profile.current') ?? 'full');
  const profileVeto = useRef<PluginDisposable | null>(null);

  useEffect(() => {
    let alive = true;
    void pluginHostPromise.then((host) => {
      if (alive) setStatuses(host.list());
    });
    return () => {
      alive = false;
    };
  }, []);

  const applyProfile = (name: string): void => {
    setProfile(name);
    localStorage.setItem('profile.current', name);
    window.dispatchEvent(new CustomEvent(PROFILE_CHANGED_EVENT));
    if (name === 'minimal') {
      if (!profileVeto.current) {
        profileVeto.current = eventBus.intercept('ai.request', () => ({
          allowed: false,
          reason: 'minimal 发行档已禁用全部 AI 请求',
        }));
      }
    } else {
      profileVeto.current?.dispose();
      profileVeto.current = null;
    }
  };

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

      <div>
        <div className="mb-1 text-sm font-medium">{t('plugins.profile.title')}</div>
        <div className="flex flex-wrap gap-2">
          {(['full', 'webnovel', 'literary', 'minimal'] as const).map((name) => (
            <Button
              key={name}
              size="sm"
              variant={profile === name ? 'default' : 'outline'}
              onClick={() => applyProfile(name)}
            >
              {t(`plugins.profile.${name}`)}
            </Button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('plugins.profile.hint')}</p>
      </div>

      <div>
        <Button size="sm" variant="outline" onClick={() => setTree((v) => (v ? null : assemblyTree({ name: 'current', plugins: ['com.novalocal.bundle.core', 'com.novalocal.bundle.world', 'com.novalocal.bundle.ai'], policies: {} })))}>
          {tree ? t('plugins.tree.hide') : t('plugins.tree.show')}
        </Button>
        {tree && (
          <div className="mt-2 overflow-x-auto rounded-lg border border-border p-3 font-mono text-xs">
            {tree.map((row) => (
              <div key={row.feature} className={row.enabled ? 'text-foreground' : 'text-muted-foreground'}>
                {row.enabled ? '✓' : '✗'} {row.feature} <span className="text-muted-foreground">← {row.source}{row.reason ? `（${row.reason}）` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

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
