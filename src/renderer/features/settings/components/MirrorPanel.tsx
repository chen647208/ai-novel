/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 外部文件夹镜像：导出 Markdown + project.json 到所选文件夹，供云盘同步或导入。 */
import { FolderDown, FolderUp } from 'lucide-react';
import React, { useState } from 'react';

import { useProjectStore } from '@/app/stores/projectStore';
import { useTranslation } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import { exportMirrorToFolder, importMirrorFromFolder } from '@/shared/services/mirrorService';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';

const MirrorPanel: React.FC = () => {
  const { t } = useTranslation('settings');
  const project = useProjectStore((state) => state.projects.find((item) => item.id === state.activeProjectId) ?? null);
  const [busy, setBusy] = useState(false);

  const pickFolder = async (): Promise<string | null> => {
    const api = window.electronAPI;
    if (!api) {
      dialogService.alert(t('mirror.desktopOnly'));
      return null;
    }
    const result = await api.openDirectoryDialog({ title: t('mirror.pickTitle') });
    const dirPath = result.filePaths[0];
    if (result.canceled || !dirPath) return null;
    return dirPath;
  };

  const handleExport = async () => {
    if (!project) return;
    const dirPath = await pickFolder();
    if (!dirPath) return;
    setBusy(true);
    try {
      const count = await exportMirrorToFolder(project, dirPath);
      dialogService.alert(t('mirror.exported', { count }));
    } catch {
      dialogService.alert(t('mirror.failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    const dirPath = await pickFolder();
    if (!dirPath) return;
    setBusy(true);
    try {
      const imported = await importMirrorFromFolder(dirPath);
      imported.id = `${Date.now()}`;
      useProjectStore.getState().upsertProject(imported);
      dialogService.alert(t('mirror.imported', { title: imported.title }));
    } catch {
      dialogService.alert(t('mirror.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderDown className="size-4 text-muted-foreground" />
          {t('mirror.title')}
        </CardTitle>
        <CardDescription>{t('mirror.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy || !project} onClick={() => void handleExport()}>
          <FolderDown className="size-3.5" />
          {t('mirror.export')}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void handleImport()}>
          <FolderUp className="size-3.5" />
          {t('mirror.import')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MirrorPanel;
