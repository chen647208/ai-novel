/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 聊天附件收集（从 GlobalAssistant 抽出，读取器注入以便单测）。
 * 处理图片/PDF/纯文本三类；返回待发送的图片与知识条目，错误经 alert 回调提示。
 */
import { CHAT_IMAGE_MAX_BYTES, CHAT_IMAGE_MIMES, CHAT_PDF_MAX_BYTES } from '@shared/constants/chat';
import type { KnowledgeItem } from '@shared/types';

export interface PendingImage {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
}

export interface AttachmentDeps {
  visionAvailable: boolean;
  readDataUrl: (file: File) => Promise<string>;
  readText: (file: File) => Promise<string>;
  extractPdfText?: (base64: string) => Promise<{ text: string }>;
  alert: (key: string, params?: Record<string, unknown>) => void;
  logError: (message: string, name: string, error: unknown) => void;
  now: () => number;
  makeId: (prefix: string, index: number) => string;
}

export interface AttachmentResult {
  images: PendingImage[];
  items: KnowledgeItem[];
}

const TEXT_EXT = /\.(md|json|txt|csv|js|ts|tsx|jsx)$/i;

/** 逐个分类处理文件；不抛错，单文件失败记日志后继续。 */
export async function collectChatAttachments(files: File[], deps: AttachmentDeps): Promise<AttachmentResult> {
  const images: PendingImage[] = [];
  const items: KnowledgeItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;

    if (file.type.startsWith('image/')) {
      if (!CHAT_IMAGE_MIMES.includes(file.type)) {
        deps.alert('chat.imageTypeUnsupported', { name: file.name });
        continue;
      }
      if (file.size > CHAT_IMAGE_MAX_BYTES) {
        deps.alert('chat.imageTooLarge', { name: file.name, size: Math.round(CHAT_IMAGE_MAX_BYTES / 1024 / 1024) });
        continue;
      }
      if (!deps.visionAvailable) {
        deps.alert('chat.noVision');
        continue;
      }
      try {
        const dataUrl = await deps.readDataUrl(file);
        images.push({ id: deps.makeId('chat-img', i), name: file.name, mime: file.type, dataUrl });
      } catch (err) {
        deps.logError('Failed to read image', file.name, err);
      }
      continue;
    }

    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      if (file.size > CHAT_PDF_MAX_BYTES) {
        deps.alert('chat.pdfTooLarge', { name: file.name, size: Math.round(CHAT_PDF_MAX_BYTES / 1024 / 1024) });
        continue;
      }
      try {
        const dataUrl = await deps.readDataUrl(file);
        const base64 = dataUrl.split(',')[1] ?? '';
        if (!deps.extractPdfText || !base64) {
          deps.alert('chat.pdfFailed', { name: file.name });
          continue;
        }
        const { text } = await deps.extractPdfText(base64);
        if (!text.trim()) {
          deps.alert('chat.pdfEmpty', { name: file.name });
          continue;
        }
        items.push({
          id: deps.makeId('chat-pdf', i),
          name: file.name,
          content: text,
          type: 'pdf',
          size: file.size,
          addedAt: deps.now(),
          category: 'writing',
        });
      } catch (err) {
        deps.logError('Failed to extract PDF', file.name, err);
        deps.alert('chat.pdfFailed', { name: file.name });
      }
      continue;
    }

    if (file.type.startsWith('text/') || TEXT_EXT.test(file.name)) {
      try {
        const text = await deps.readText(file);
        items.push({
          id: deps.makeId('chat-file', i),
          name: file.name,
          content: text,
          type: file.name.split('.').pop() || 'txt',
          size: file.size,
          addedAt: deps.now(),
          category: 'writing',
        });
      } catch (err) {
        deps.logError('Failed to read file', file.name, err);
      }
    }
  }

  return { images, items };
}
