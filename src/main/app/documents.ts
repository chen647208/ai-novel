/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 文档文本提取（docs/design/16）：主进程解析 PDF 为纯文本，供助手作为提示词上下文。
 * 不把二进制直接送给模型。unpdf 为纯 JS（MIT），按需动态加载，避免影响主进程启动。
 */

import { Buffer } from 'node:buffer';

export interface ExtractedDocument {
  text: string;
  pages: number;
}

/**
 * 从 base64 编码的 PDF 中提取文本。
 * @throws 负载非法或解析失败时抛错，调用方负责提示用户。
 */
export async function extractPdfText(base64: string): Promise<ExtractedDocument> {
  if (typeof base64 !== 'string' || base64.length === 0) {
    throw new TypeError('Invalid PDF payload');
  }
  const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  const { getDocumentProxy, extractText } = await import('unpdf');
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { text, pages: totalPages };
}
