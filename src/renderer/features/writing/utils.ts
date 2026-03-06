import type { AIHistoryRecord, Chapter, Project } from '../../../shared/types';
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
  const previousChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const previousContent = previousChapter?.content?.trim() || '';
  const previousContextText = previousContent.length > MAX_CHAPTER_CONTEXT_LENGTH
    ? `...${previousContent.slice(-MAX_CHAPTER_CONTEXT_LENGTH)}`
    : previousContent;
  const nextChapter = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;
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

export const getPreviousChapterSummaryIds = (chapters: Chapter[], currentChapter: Chapter | null) => {
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

export const buildExportContent = (project: Project, selectedChapterIds: Set<string>) => {
  const chaptersToExport = project.chapters
    .filter((chapter) => selectedChapterIds.has(chapter.id))
    .sort((a, b) => a.order - b.order);

  let fileContent = `《${project.title}》\n\n`;
  if (project.intro) {
    fileContent += `简介：\n${project.intro}\n\n================================\n\n`;
  }

  chaptersToExport.forEach((chapter) => {
    fileContent += `第 ${chapter.order + 1} 章：${chapter.title}\n\n${chapter.content || '（暂无内容）'}\n\n--------------------------------\n\n`;
  });

  return fileContent;
};

export const buildExportFilename = (projectTitle: string, now: Date = new Date()) => {
  const safeTitle = projectTitle.replace(/[\\/:*?"<>|]/g, '_');
  return `${safeTitle}_导出稿_${now.toISOString().split('T')[0]}.txt`;
};

export const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
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
  return `输入: ${tokens.prompt} | 输出: ${tokens.completion} | 总计: ${tokens.total}`;
};

export const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'gemini':
      return 'fas fa-robot text-blue-500';
    case 'ollama':
      return 'fas fa-server text-green-500';
    case 'openai-compatible':
      return 'fas fa-brain text-purple-500';
    default:
      return 'fas fa-microchip text-gray-500';
  }
};

export const getGenerationType = (record: AIHistoryRecord) => {
  if (record.metadata?.batchGeneration) {
    return '批量生成';
  }
  if (record.metadata?.templateName?.includes('润色') || record.metadata?.templateName?.includes('扩写')) {
    return '润色/扩写';
  }
  return '正文生成';
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

