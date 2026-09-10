/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 人物卡导出（docs/design/16）：Markdown 文本构建 + 另存为。 */
import type { Character } from '../../../shared/types';
import { dt } from '@/i18n';
import { roleLabel, genderLabel } from './displayLabels';

/** 人物卡字段（空值不落，顺序固定）。 */
const FIELDS: Array<{ key: keyof Character | 'roleLabel' | 'genderLabel'; labelKey: string }> = [
  { key: 'roleLabel', labelKey: 'characters:card.role' },
  { key: 'genderLabel', labelKey: 'characters:card.gender' },
  { key: 'age', labelKey: 'characters:card.age' },
  { key: 'occupation', labelKey: 'characters:card.occupation' },
  { key: 'appearance', labelKey: 'characters:card.appearance' },
  { key: 'distinctiveFeatures', labelKey: 'characters:card.features' },
  { key: 'personality', labelKey: 'characters:card.personality' },
  { key: 'background', labelKey: 'characters:card.background' },
  { key: 'motivation', labelKey: 'characters:card.motivation' },
  { key: 'strengths', labelKey: 'characters:card.strengths' },
  { key: 'weaknesses', labelKey: 'characters:card.weaknesses' },
  { key: 'characterArc', labelKey: 'characters:card.arc' },
  { key: 'relationships', labelKey: 'characters:card.relationships' },
];

/** 构建人物卡 Markdown（纯函数，标签随界面语言）。 */
export function buildCharacterCardMarkdown(character: Character, bookTitle: string): string {
  const valueOf = (key: (typeof FIELDS)[number]['key']): string => {
    if (key === 'roleLabel') return roleLabel(character.role);
    if (key === 'genderLabel') return genderLabel(character.gender);
    const raw = character[key];
    return typeof raw === 'string' ? raw : '';
  };
  const lines = [`# ${character.name}`, '', `> ${dt('characters:card.docTitle')} · ${bookTitle}`, ''];
  for (const field of FIELDS) {
    const value = valueOf(field.key).trim();
    if (value) lines.push(`- **${dt(field.labelKey)}**：${value}`);
  }
  return `${lines.join('\n')}\n`;
}

type ElectronAPI = NonNullable<Window['electronAPI']>;

/** 导出为 .md：桌面端另存为，网页端回退下载。 */
export async function exportCharacterCard(character: Character, bookTitle: string): Promise<{ canceled: boolean; path?: string }> {
  const md = buildCharacterCardMarkdown(character, bookTitle);
  const api: ElectronAPI | undefined = typeof window !== 'undefined' ? window.electronAPI : undefined;
  const fileName = `${character.name}-${dt('characters:card.docTitle')}.md`;
  if (api) {
    const target = await api.saveFileDialog({
      title: dt('characters:card.export'),
      defaultPath: fileName,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (target.canceled || !target.filePath) return { canceled: true };
    await api.writeFile(target.filePath, md);
    return { canceled: false, path: target.filePath };
  }
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return { canceled: false };
}
