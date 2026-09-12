/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 备份恢复预览：列出快照内的书，按条目勾选后再恢复。 */
import React, { useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/i18n';
import { Button } from '@/shared/ui/Button';
import { DialogTitle } from '@/shared/ui/Dialog';
import { ModalShell } from '@/shared/ui/ModalShell';

import type { AppState } from '../../../../shared/types';

interface BackupRestoreDialogProps {
  open: boolean;
  snapshot: AppState | null;
  fileName: string;
  onClose: () => void;
  onConfirm: (selectedProjectIds: string[]) => void;
}

export const BackupRestoreDialog: React.FC<BackupRestoreDialogProps> = ({ open, snapshot, fileName, onClose, onConfirm }) => {
  const { t } = useTranslation('settings');
  const projects = useMemo(() => snapshot?.projects ?? [], [snapshot]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set(projects.map((p) => p.id)));
  }, [open, projects]);

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ModalShell open={open} onOpenChange={(o) => { if (!o) onClose(); }} contentClassName="max-h-[80vh] w-[92vw] max-w-lg overflow-hidden">
      <DialogTitle className="text-base font-medium">{t('storage.restorePreviewTitle')}</DialogTitle>
      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{fileName}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t('storage.restorePreviewHint')}</p>

      <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
        {projects.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('storage.restoreEmpty')}</p>
        ) : (
          projects.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              <span className="truncate">{p.title || p.id}</span>
            </label>
          ))
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>{t('storage.restoreCancel')}</Button>
        <Button
          size="sm"
          disabled={selected.size === 0}
          onClick={() => onConfirm([...selected])}
        >
          {t('storage.restoreSelected', { count: selected.size })}
        </Button>
      </div>
    </ModalShell>
  );
};
