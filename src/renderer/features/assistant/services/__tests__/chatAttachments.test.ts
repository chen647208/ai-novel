/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect, vi } from 'vitest';
import { collectChatAttachments, type AttachmentDeps } from '../chatAttachments';
import { CHAT_IMAGE_MAX_BYTES } from '@shared/constants/chat';

function file(name: string, type: string, size = 100): File {
  return { name, type, size } as unknown as File;
}

function deps(overrides: Partial<AttachmentDeps> = {}): AttachmentDeps {
  return {
    visionAvailable: true,
    readDataUrl: async () => 'data:application/octet-stream;base64,QUJD',
    readText: async () => '正文',
    extractPdfText: async () => ({ text: 'PDF 内容' }),
    alert: vi.fn(),
    logError: vi.fn(),
    now: () => 1000,
    makeId: (prefix, i) => `${prefix}-${i}`,
    ...overrides,
  };
}

describe('collectChatAttachments', () => {
  it('图片：读取为 dataURL', async () => {
    const r = await collectChatAttachments([file('a.png', 'image/png')], deps());
    expect(r.images).toHaveLength(1);
    expect(r.images[0]?.mime).toBe('image/png');
  });

  it('图片超限：告警且不入列', async () => {
    const d = deps();
    const r = await collectChatAttachments([file('big.png', 'image/png', CHAT_IMAGE_MAX_BYTES + 1)], d);
    expect(r.images).toHaveLength(0);
    expect(d.alert).toHaveBeenCalledWith('chat.imageTooLarge', expect.anything());
  });

  it('PDF：提取文本入知识条目', async () => {
    const r = await collectChatAttachments([file('b.pdf', 'application/pdf')], deps());
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.content).toBe('PDF 内容');
    expect(r.items[0]?.type).toBe('pdf');
  });

  it('PDF 空文本：告警不入列', async () => {
    const d = deps({ extractPdfText: async () => ({ text: '   ' }) });
    const r = await collectChatAttachments([file('c.pdf', 'application/pdf')], d);
    expect(r.items).toHaveLength(0);
    expect(d.alert).toHaveBeenCalledWith('chat.pdfEmpty', expect.anything());
  });

  it('文本文件：内容入知识条目', async () => {
    const r = await collectChatAttachments([file('d.md', 'text/markdown')], deps());
    expect(r.items[0]?.content).toBe('正文');
  });

  it('视觉关闭：图片被拦截', async () => {
    const d = deps({ visionAvailable: false });
    const r = await collectChatAttachments([file('e.png', 'image/png')], d);
    expect(r.images).toHaveLength(0);
    expect(d.alert).toHaveBeenCalledWith('chat.noVision');
  });
});
