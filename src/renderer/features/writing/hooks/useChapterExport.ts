/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 章节导出编排（从 WritingEditor 抽出）：选择章节/格式/导出预设并执行落盘。
 */
import { useState } from 'react';
import type { TFunction } from 'i18next';
import type { Project } from '../../../../shared/types';
import { dialogService } from '@/shared/services/dialogService';
import { buildProfileRegistry } from '@/shared/services/buildProfiles';
import {
  buildExportContent,
  buildExportFilename,
  buildExportPackage,
  savePackageFile,
  saveExportFile,
} from '../utils';
import type { ExportFormat } from '../types';

interface UseChapterExportOptions {
  project: Project;
  t: TFunction<['writing', 'steps']>;
}

export function useChapterExport({ project, t }: UseChapterExportOptions) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('txt');
  const [profileId, setProfileId] = useState('');

  const openModal = () => {
    setSelectedIds(new Set(project.chapters.map((c) => c.id)));
    setOpen(true);
  };

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === project.chapters.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(project.chapters.map((c) => c.id)));
  };

  const execute = async () => {
    if (selectedIds.size === 0) {
      dialogService.alert(t('editor.selectAtLeastOne'));
      return;
    }
    const filename = buildExportFilename(project.title, format);
    const profile = profileId ? buildProfileRegistry.get(profileId) : undefined;
    try {
      if (format === 'epub' || format === 'docx') {
        const files = buildExportPackage(project, selectedIds, format, profile);
        const fallbackHtml = buildExportContent(project, selectedIds, 'html', profile);
        await savePackageFile(filename, files, format, fallbackHtml);
      } else {
        const fileContent = buildExportContent(project, selectedIds, format, profile);
        await saveExportFile(filename, fileContent, format);
      }
      setOpen(false);
    } catch (err) {
      dialogService.alert(t('editor.exportFailed', { error: err instanceof Error ? err.message : t('editor.unknownError') }));
    }
  };

  return { open, setOpen, selectedIds, format, setFormat, profileId, setProfileId, openModal, toggle, toggleAll, execute };
}
