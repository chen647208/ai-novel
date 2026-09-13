/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 操作日志：按时间倒序展示当前作品的正文修订，标注作者与触发原因。 */
import { History } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { useProjectStore } from '@/app/stores/projectStore';
import { useTranslation } from '@/i18n';
import { loadOperationLog, type OperationLogEntry } from '@/shared/services/operationLogService';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';

const OperationLogPanel: React.FC = () => {
  const { t } = useTranslation('settings');
  const workId = useProjectStore((state) => state.activeProjectId);
  const [entries, setEntries] = useState<OperationLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!workId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const list = await loadOperationLog(workId, 100);
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            {t('operationLog.title')}
          </CardTitle>
          <CardDescription>{t('operationLog.subtitle')}</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading || !workId}>
          {t('operationLog.refresh')}
        </Button>
      </CardHeader>
      <CardContent>
        {!workId ? (
          <p className="text-xs text-muted-foreground">{t('operationLog.noWork')}</p>
        ) : entries.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">{t('operationLog.empty')}</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 rounded border border-border px-3 py-1.5 text-xs">
                <span className="w-36 shrink-0 text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                <span className="w-24 shrink-0 truncate font-medium">{entry.actor}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{entry.preview.replace(/\s+/g, ' ').slice(0, 80)}</span>
                {entry.cause && <span className="shrink-0 text-muted-foreground">{entry.cause}</span>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default OperationLogPanel;
