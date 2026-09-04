/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import type { AIHistoryRecord, Chapter, Project } from '../../../shared/types';
import { i18n } from '@/i18n';
import { Bot, Brain, Cpu, Feather, Server, type LucideIcon } from 'lucide-react';
import {
  FLOATING_MENU_HEIGHT,
  FLOATING_MENU_OFFSET_X,
  FLOATING_MENU_OFFSET_Y,
  FLOATING_MENU_VIEWPORT_MARGIN,
  FLOATING_MENU_WIDTH,
  MAX_CHAPTER_CONTEXT_LENGTH,
  MAX_PREVIOUS_CHAPTER_SUMMARIES,
} from './constants';
import type { TextSelectionRange, TokenUsage } from './types';

export const debounce = <Args extends unknown[]>(func: (...args: Args) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const getChapterContext = (chapters: Chapter[], currentChapter: Chapter) => {
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  const currentIndex = sortedChapters.findIndex((chapter) => chapter.id === currentChapter.id);
  const previousChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] ?? null : null;
  const previousContent = previousChapter?.content?.trim() || '';
  const previousContextText = previousContent.length > MAX_CHAPTER_CONTEXT_LENGTH
    ? `...${previousContent.slice(-MAX_CHAPTER_CONTEXT_LENGTH)}`
    : previousContent;
  const nextChapter = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] ?? null : null;
  const nextSummary = nextChapter?.summary?.trim() || '';

  return {
    prevChapter: previousChapter,
    prevContextText: previousContextText,
    nextChapter,
    nextSummary,
  };
};

export const toggleSetValue = (source: Set<string>, value: string) => {
  const next = new Set(source);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
};

export const getPreviousChapterSummaryIds = (chapters: Chapter[], currentChapter: Chapter | null | undefined) => {
  if (!currentChapter) {
    return new Set<string>();
  }

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  const currentIndex = sortedChapters.findIndex((chapter) => chapter.id === currentChapter.id);
  const previousChapters = sortedChapters.slice(Math.max(0, currentIndex - MAX_PREVIOUS_CHAPTER_SUMMARIES), currentIndex);

  return new Set(
    previousChapters
      .filter((chapter) => chapter.contentSummary && chapter.contentSummary.trim().length > 0)
      .map((chapter) => chapter.id),
  );
};

export type ExportFormat = 'txt' | 'md' | 'html';

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const buildExportContent = (project: Project, selectedChapterIds: Set<string>, format: ExportFormat = 'txt') => {
  const chaptersToExport = project.chapters
    .filter((chapter) => selectedChapterIds.has(chapter.id))
    .sort((a, b) => a.order - b.order);
  const chapterHeader = (num: number, title: string) => i18n.t('writing:export.chapterHeader', { num, title });
  const noContent = i18n.t('writing:export.noContent');

  if (format === 'md') {
    let md = `# ${project.title}\n\n`;
    if (project.intro) md += `> ${project.intro}\n\n`;
    chaptersToExport.forEach((chapter) => {
      md += `## ${chapterHeader(chapter.order + 1, chapter.title)}\n\n${chapter.content || noContent}\n\n`;
    });
    return md;
  }

  if (format === 'html') {
    const body = chaptersToExport
      .map((chapter) => {
        const paragraphs = (chapter.content || noContent)
          .split(/\n+/)
          .filter((p) => p.trim().length > 0)
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join('\n');
        return `<section>\n<h2>${escapeHtml(chapterHeader(chapter.order + 1, chapter.title))}</h2>\n${paragraphs}\n</section>`;
      })
      .join('\n');
    return [
      '<!DOCTYPE html>',
      '<html lang="zh-CN"><head><meta charset="utf-8">',
      `<title>${escapeHtml(project.title)}</title>`,
      '<style>body{max-width:42em;margin:3em auto;padding:0 1.5em;font-family:"Songti SC",serif;line-height:1.9;color:#222}h1{text-align:center}h2{margin-top:2.5em;font-size:1.2em}p{text-indent:2em;margin:0.6em 0}</style>',
      '</head><body>',
      `<h1>${escapeHtml(project.title)}</h1>`,
      project.intro ? `<p class="intro">${escapeHtml(project.intro)}</p>` : '',
      body,
      '</body></html>',
    ].join('\n');
  }

  let fileContent = `${i18n.t('writing:export.bookTitleTxt', { title: project.title })}\n\n`;
  if (project.intro) {
    fileContent += `${i18n.t('writing:export.introLabel')}${project.intro}\n\n================================\n\n`;
  }

  chaptersToExport.forEach((chapter) => {
    fileContent += `${chapterHeader(chapter.order + 1, chapter.title)}\n\n${chapter.content || noContent}\n\n--------------------------------\n\n`;
  });

  return fileContent;
};

const EXPORT_EXT: Record<ExportFormat, string> = { txt: 'txt', md: 'md', html: 'html' };
const EXPORT_MIME: Record<ExportFormat, string> = { txt: 'text/plain', md: 'text/markdown', html: 'text/html' };

export const buildExportFilename = (projectTitle: string, format: ExportFormat = 'txt', now: Date = new Date()) => {
  const safeTitle = projectTitle.replace(/[\\/:*?"<>|]/g, '_');
  return `${safeTitle}_${i18n.t('writing:export.fileSuffix')}_${now.toISOString().split('T')[0]}.${EXPORT_EXT[format]}`;
};

/**
 * 保存导出文件：Electron 环境优先用原生"另存为"对话框写入用户选择的路径，
 * 浏览器/开发模式下回退到 <a download>。
 */
export const saveExportFile = async (filename: string, content: string, format: ExportFormat): Promise<void> => {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
  if (api?.saveFileDialog && api?.writeFile) {
    const result = await api.saveFileDialog({
      title: i18n.t('writing:export.fileDialogTitle'),
      defaultPath: filename,
      filters: [{ name: i18n.t('writing:export.fileFilterName'), extensions: [EXPORT_EXT[format]] }],
    });
    if (result.canceled || !result.filePath) return; // 用户取消
    await api.writeFile(result.filePath, content);
    return;
  }
  downloadTextFile(filename, content, EXPORT_MIME[format]);
};

export const downloadTextFile = (filename: string, content: string, mime = 'text/plain') => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getFloatingMenuPosition = (x: number, y: number) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let nextX = x + FLOATING_MENU_OFFSET_X;
  let nextY = y + FLOATING_MENU_OFFSET_Y;

  if (nextX + FLOATING_MENU_WIDTH > viewportWidth - FLOATING_MENU_VIEWPORT_MARGIN) {
    nextX = viewportWidth - FLOATING_MENU_WIDTH - FLOATING_MENU_VIEWPORT_MARGIN;
  } else if (nextX < FLOATING_MENU_VIEWPORT_MARGIN) {
    nextX = FLOATING_MENU_VIEWPORT_MARGIN;
  }

  if (nextY + FLOATING_MENU_HEIGHT > viewportHeight - FLOATING_MENU_VIEWPORT_MARGIN) {
    nextY = viewportHeight - FLOATING_MENU_HEIGHT - FLOATING_MENU_VIEWPORT_MARGIN;
  } else if (nextY < FLOATING_MENU_VIEWPORT_MARGIN) {
    nextY = FLOATING_MENU_VIEWPORT_MARGIN;
  }

  return { x: nextX, y: nextY };
};

export const isSelectionAvailable = (range: TextSelectionRange | null) => {
  return !!range && range.end > range.start;
};

export const formatHistoryTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const formatTokenUsage = (tokens?: TokenUsage) => {
  if (!tokens) {
    return 'N/A';
  }
  return i18n.t('writing:utils.tokenUsage', { input: tokens.prompt, output: tokens.completion, total: tokens.total });
};

export const getProviderIcon = (provider: string): { icon: LucideIcon; cls: string } => {
  switch (provider) {
    case 'gemini':
      return { icon: Bot, cls: 'text-blue-500' };
    case 'ollama':
      return { icon: Server, cls: 'text-green-500' };
    case 'anthropic':
      return { icon: Feather, cls: 'text-orange-500' };
    case 'openai-responses':
      return { icon: Brain, cls: 'text-indigo-500' };
    case 'openai-chat':
      return { icon: Brain, cls: 'text-purple-500' };
    default:
      return { icon: Cpu, cls: 'text-gray-500' };
  }
};

export const getGenerationType = (record: AIHistoryRecord) => {
  // 模板名匹配基于项目数据中存储的中文模板名（数据值），保持字面
  if (record.metadata?.batchGeneration) {
    return i18n.t('writing:utils.genTypeBatch');
  }
  if (record.metadata?.templateName?.includes('润色') || record.metadata?.templateName?.includes('扩写')) {
    return i18n.t('writing:utils.genTypePolish');
  }
  return i18n.t('writing:utils.genTypeContent');
};
export const getTextSelectionSnapshot = (textarea: HTMLTextAreaElement) => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value.substring(start, end);

  if (!text.trim() || start === end) {
    return null;
  }

  return {
    text,
    range: { start, end },
  };
};

export const getKeyboardSelectionMenuPosition = (textarea: HTMLTextAreaElement) => {
  const textareaRect = textarea.getBoundingClientRect();
  const xPos = textareaRect.left + textareaRect.width / 2 - 100;
  const yPos = textareaRect.top + textareaRect.height / 2 - 30;

  return getFloatingMenuPosition(xPos, yPos);
};

