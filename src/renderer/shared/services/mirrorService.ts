/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 外部文件夹镜像：把作品导出为可读 Markdown 与 project.json，用云盘同步非活库副本。 */
import type { Project } from '@shared/types';

export interface MirrorFile {
  /** 相对所选文件夹的路径。 */
  path: string;
  content: string;
}

/** 去掉文件名非法字符。 */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return cleaned || 'untitled';
}

export function buildMirrorFiles(project: Project, now = new Date()): MirrorFile[] {
  const ordered = [...project.chapters].sort((a, b) => a.order - b.order);
  const files: MirrorFile[] = [
    { path: 'project.json', content: JSON.stringify(project, null, 2) },
    {
      path: 'meta.json',
      content: JSON.stringify(
        { app: 'hongyue-creation', title: project.title, exportedAt: now.toISOString(), chapters: ordered.length },
        null,
        2,
      ),
    },
  ];
  ordered.forEach((chapter, index) => {
    const prefix = String(index + 1).padStart(3, '0');
    files.push({
      path: `chapters/${prefix}-${sanitizeFileName(chapter.title)}.md`,
      content: `# ${chapter.title}\n\n${chapter.content}\n`,
    });
  });
  return files;
}

export async function exportMirrorToFolder(project: Project, dirPath: string): Promise<number> {
  const api = window.electronAPI;
  if (!api) throw new Error('mirror-desktop-only');
  const files = buildMirrorFiles(project);
  for (const file of files) {
    await api.writeFile(`${dirPath}/${file.path}`, file.content);
  }
  return files.length;
}

export async function importMirrorFromFolder(dirPath: string): Promise<Project> {
  const api = window.electronAPI;
  if (!api) throw new Error('mirror-desktop-only');
  const raw = await api.readFile(`${dirPath}/project.json`);
  return JSON.parse(raw) as Project;
}
