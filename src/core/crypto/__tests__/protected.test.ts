/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { encryptBody, decryptBody, isEncryptedEnvelope, ProtectedSession } from '../protected.js';

describe('信封加密（encryptBody/decryptBody）', () => {
  it('往返无损；信封带前缀且不含明文', async () => {
    const body = '第 13 章草稿：主角在雨夜察觉了伏笔。';
    const envelope = await encryptBody(body, '口令-abc123');
    expect(isEncryptedEnvelope(envelope)).toBe(true);
    expect(envelope).not.toContain('雨夜');
    expect(await decryptBody(envelope, '口令-abc123')).toBe(body);
  });

  it('错误口令解密失败并抛出可读错误', async () => {
    const envelope = await encryptBody('机密内容', '正确口令');
    await expect(decryptBody(envelope, '错误口令')).rejects.toThrow('口令错误');
  });

  it('非信封文本判定与解密拒绝', async () => {
    expect(isEncryptedEnvelope('普通正文')).toBe(false);
    await expect(decryptBody('普通正文', '任意')).rejects.toThrow('不是加密信封');
  });
});

describe('ProtectedSession（受保护会话）', () => {
  it('解锁后加密/解密闭环；lock 后拒绝', async () => {
    const session = new ProtectedSession();
    expect(session.unlocked).toBe(false);
    await expect(session.encrypt('x')).rejects.toThrow('未解锁');

    await session.unlock('口令-xyz');
    expect(session.unlocked).toBe(true);
    const envelope = await session.encrypt('受保护章节正文');
    expect(isEncryptedEnvelope(envelope)).toBe(true);
    expect(await session.decrypt(envelope)).toBe('受保护章节正文');

    session.lock();
    expect(session.unlocked).toBe(false);
    await expect(session.decrypt(envelope)).rejects.toThrow('未解锁');
  });

  it('跨会话解密：同口令新会话按信封盐派生仍可解', async () => {
    const first = new ProtectedSession();
    await first.unlock('同一口令');
    const envelope = await first.encrypt('跨会话内容');
    first.lock();

    const second = new ProtectedSession();
    await second.unlock('同一口令');
    expect(await second.decrypt(envelope)).toBe('跨会话内容');

    const wrong = new ProtectedSession();
    await wrong.unlock('别的口令');
    await expect(wrong.decrypt(envelope)).rejects.toThrow('口令错误');
  });
});
