/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { Globe } from 'lucide-react';
import React, { useState } from 'react';

import { useSettingsStore } from '@/app/stores/settingsStore';
import { useTranslation } from '@/i18n';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';

type ElectronAPI = NonNullable<Window['electronAPI']>;

function api(): ElectronAPI | undefined {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
}

/** 网络代理设置（docs/design/15）：地址失焦即存（非法标红不存），测试连接给对照结果。 */
const ProxyPanel: React.FC = () => {
  const { t } = useTranslation('settings');
  const savedUrl = useSettingsStore((s) => s.proxy?.url ?? '');
  const store = useSettingsStore.getState();
  const [draft, setDraft] = useState(savedUrl);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const desktop = !!api();

  // 外部写入（如导入）回填输入框
  React.useEffect(() => {
    setDraft(savedUrl);
  }, [savedUrl]);

  const commit = () => {
    const value = draft.trim();
    if (!value) {
      store.setProxy(undefined);
      setError(null);
      return;
    }
    // 与主进程 parseProxyUrl 同规则的轻校验（http/https/socks5 + 主机名）
    try {
      const u = new URL(value);
      if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(u.protocol) || !u.hostname) {
        throw new Error('bad proxy');
      }
    } catch {
      setError(t('general.proxyBadUrl'));
      return;
    }
    store.setProxy({ url: value });
    setError(null);
  };

  const handleTest = async () => {
    const a = api();
    if (!a) return;
    setTesting(true);
    setResult(null);
    try {
      const r = await a.net.testProxy(draft.trim());
      setResult(r.ok
        ? t('general.proxyOk', { status: r.status ?? 200 })
        : t('general.proxyFail', { error: r.error ?? 'unknown' }));
    } catch (err) {
      setResult(t('general.proxyFail', { error: err instanceof Error ? err.message : String(err) }));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" />
          {t('general.proxyTitle')}
        </CardTitle>
        <CardDescription>{t('general.proxyHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-w-md space-y-2">
          <Label htmlFor="proxy-url">{t('general.proxyLabel')}</Label>
          <Input
            id="proxy-url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            placeholder={t('general.proxyPlaceholder')}
            className="font-mono"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!desktop || testing} onClick={() => void handleTest()}>
            {testing ? t('general.proxyTesting') : t('general.proxyTest')}
          </Button>
          {result && <span className="text-xs text-muted-foreground">{result}</span>}
        </div>
        {!desktop && <p className="text-xs text-muted-foreground">{t('general.proxyWebNote')}</p>}
        <p className="text-xs text-muted-foreground">{t('general.proxyLocalNote')}</p>
      </CardContent>
    </Card>
  );
};

export default ProxyPanel;
