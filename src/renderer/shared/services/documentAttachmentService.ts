/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 文档附件（attachments + blobs 六实体）：把助手参考文件按书持久化，
 * 元数据落 attachments、二进制落 blobs。仅 SQLite 后端支持，其他后端降级为空操作。
 */
import { logger } from '../utils/logger';
import { repository } from './repository/index.js';

const ROLE = 'document';

/** 对 UI 暴露的文档附件视图（不泄漏 repository 内部类型）。 */
export interface DocumentAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: number;
}

/** 当前后端是否支持文档附件（仅 SQLite）。 */
export function attachmentsSupported(): boolean {
  return typeof repository.listAttachments === 'function' && typeof repository.saveAttachment === 'function';
}

export async function listAttachments(bookId: string): Promise<DocumentAttachment[]> {
  if (!repository.listAttachments) return [];
  const metas = await repository.listAttachments(bookId);
  return metas.map((meta) => ({ id: meta.id, name: meta.name, mime: meta.mime, size: meta.size, createdAt: meta.createdAt }));
}

/** 保存一个文件为书的文档附件；后端不支持返回 null。 */
export async function saveAttachmentFile(bookId: string, file: File): Promise<DocumentAttachment | null> {
  if (!repository.saveAttachment) return null;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const meta = await repository.saveAttachment({
      nodeId: bookId,
      role: ROLE,
      mime: file.type || 'application/octet-stream',
      name: file.name,
      bytes,
    });
    return { id: meta.id, name: meta.name, mime: meta.mime, size: meta.size, createdAt: meta.createdAt };
  } catch (error) {
    logger.error('保存文档附件失败:', error);
    return null;
  }
}

export async function removeAttachment(id: string): Promise<void> {
  await repository.deleteAttachment?.(id);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** 读取附件内容为可注入 prompt 的文本：PDF 走主进程解析，其余按 UTF-8 解码。 */
export async function attachmentToText(meta: DocumentAttachment): Promise<{ name: string; mime: string; content: string } | null> {
  const bytes = await repository.loadAttachmentBytes?.(meta.id);
  if (!bytes) return null;
  if (meta.mime === 'application/pdf' && window.electronAPI?.extractPdfText) {
    const result = await window.electronAPI.extractPdfText(bytesToBase64(bytes));
    return { name: meta.name, mime: meta.mime, content: result.text };
  }
  return { name: meta.name, mime: meta.mime, content: new TextDecoder().decode(bytes) };
}
