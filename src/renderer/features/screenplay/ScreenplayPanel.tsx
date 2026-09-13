/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 剧本面板：按场次查看章节，导入/导出 Fountain，新增场次。 */
import type { Chapter, Project } from '@shared/types';
import { Clapperboard, FileDown, FileUp, Plus } from 'lucide-react';
import React, { useMemo } from 'react';

import { useTranslation } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

import { chaptersToFountain, parseFountain, screenplayToChapters } from './screenplayModel';

interface ScreenplayPanelProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

const FOUNTAIN_FILTER = [{ name: 'Fountain', extensions: ['fountain', 'txt'] }];

const ScreenplayPanel: React.FC<ScreenplayPanelProps> = ({ project, onUpdate }) => {
  const { t } = useTranslation('writing');
  const chapters = useMemo(() => [...(project.chapters ?? [])].sort((a, b) => a.order - b.order), [project.chapters]);

  const importFountain = async () => {
    const api = window.electronAPI;
    if (!api) {
      dialogService.alert(t('screenplay.desktopOnly'));
      return;
    }
    const result = await api.openFileDialog({ title: t('screenplay.importTitle'), filters: FOUNTAIN_FILTER, properties: ['openFile'] });
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) return;
    const text = await api.readFile(filePath);
    const doc = parseFountain(text);
    const now = Date.now();
    const created = screenplayToChapters(doc, (index) => `${now}-${index}`);
    onUpdate({ chapters: [...chapters, ...created] });
    dialogService.alert(t('screenplay.imported', { count: created.length }));
  };

  const exportFountain = async () => {
    const api = window.electronAPI;
    if (!api) {
      dialogService.alert(t('screenplay.desktopOnly'));
      return;
    }
    const result = await api.saveFileDialog({
      title: t('screenplay.exportTitle'),
      defaultPath: `${project.title}.fountain`,
      filters: FOUNTAIN_FILTER,
    });
    if (result.canceled || !result.filePath) return;
    await api.writeFile(result.filePath, chaptersToFountain(chapters, project.title));
  };

  const addScene = () => {
    const chapter: Chapter = {
      id: String(Date.now()),
      title: t('screenplay.newScene'),
      summary: '',
      content: '',
      order: chapters.length,
      status: 'draft',
    };
    onUpdate({ chapters: [...chapters, chapter] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clapperboard className="size-4 text-muted-foreground" />
          {t('screenplay.title')}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={addScene}>
            <Plus className="size-3.5" />
            {t('screenplay.addScene')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void importFountain()}>
            <FileUp className="size-3.5" />
            {t('screenplay.import')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void exportFountain()}>
            <FileDown className="size-3.5" />
            {t('screenplay.export')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {chapters.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('screenplay.empty')}</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {chapters.map((chapter, index) => (
              <li key={chapter.id} className="flex items-center gap-2 rounded border border-border px-3 py-1.5">
                <span className="w-6 shrink-0 text-xs text-muted-foreground">{index + 1}</span>
                <span className="truncate font-medium">{chapter.title || t('screenplay.untitledScene')}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

export default ScreenplayPanel;
