/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 同步对话框：导出/导入同步包 + 冲突副本报告。 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';
import { Button } from '@/shared/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/Dialog';
import { dialogService } from '@/shared/services/dialogService';
import { exportSyncBundle, importSyncBundle, type SyncApplyReport } from '@/shared/services/syncService';
import type { Project } from '../../../shared/types';

export const SyncDialog: React.FC<{ project: Project | null }> = ({ project }) => {
  const { t } = useTranslation('app');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SyncApplyReport | null>(null);

  const handleExport = async (): Promise<void> => {
    if (!project) return;
    setBusy(true);
    try {
      const result = await exportSyncBundle(project.id, project.title);
      dialogService.alert({
        title: t('sync.exportDone'),
        message: t('sync.exportDoneMessage', { count: result.changeCount, path: result.path }),
      });
      setOpen(false);
    } catch (err) {
      if (!(err instanceof Error && err.message.includes('已取消'))) {
        dialogService.alert({ title: t('sync.exportFailed'), message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await importSyncBundle();
      setReport(result);
    } catch (err) {
      if (!(err instanceof Error && err.message.includes('已取消'))) {
        dialogService.alert({ title: t('sync.importFailed'), message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setReport(null);
          setOpen(true);
        }}
        disabled={!project}
        title={t('sync.title')}
      >
        <ArrowLeftRight className="size-4" />
      </Button>

      {open && project && (
        <Dialog open onOpenChange={(v) => { if (!v && !busy) setOpen(v); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('sync.title')}</DialogTitle>
              <DialogDescription>{t('sync.description')}</DialogDescription>
            </DialogHeader>

            {report ? (
              <div className="space-y-2 text-sm">
                <div>{t('sync.reportApplied', { count: report.applied })}</div>
                <div>{t('sync.reportSkipped', { count: report.skipped })}</div>
                <div>{t('sync.reportManual', { count: report.manual })}</div>
                {report.conflictCopies.length > 0 && (
                  <div className="rounded-md border border-border p-2">
                    <div className="mb-1 font-medium">{t('sync.conflictCopies')}</div>
                    {report.conflictCopies.map((c) => (
                      <div key={c.id} className="text-muted-foreground">
                        {c.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('sync.hint', { book: project.title })}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleImport} disabled={busy} aria-busy={busy}>
                {busy && <Spinner className="size-4" />}
                {t('sync.import')}
              </Button>
              <Button onClick={handleExport} disabled={busy} aria-busy={busy}>
                {busy && <Spinner className="size-4" />}
                {t('sync.export')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default SyncDialog;
