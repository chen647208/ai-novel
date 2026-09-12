/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import { decryptWithKey,encryptWithKey } from '../backupCrypto.js';

const KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);

describe('backupCrypto（AES-256-GCM）', () => {
  it('加密后可解密还原', () => {
    const plaintext = '{"schemaVersion":1,"projects":[]}';
    const payload = encryptWithKey(plaintext, KEY);
    expect(payload).not.toContain('schemaVersion');
    expect(decryptWithKey(payload, KEY)).toBe(plaintext);
  });

  it('同一明文两次加密产生不同密文（随机 IV）', () => {
    expect(encryptWithKey('x', KEY)).not.toBe(encryptWithKey('x', KEY));
  });

  it('错误密钥解密失败', () => {
    const payload = encryptWithKey('secret', KEY);
    expect(() => decryptWithKey(payload, OTHER_KEY)).toThrow();
  });

  it('密文被篡改则认证失败', () => {
    const payload = encryptWithKey('secret', KEY);
    const buf = Buffer.from(payload, 'base64');
    buf[buf.length - 1] = (buf[buf.length - 1] ?? 0) ^ 0xff;
    expect(() => decryptWithKey(buf.toString('base64'), KEY)).toThrow();
  });
});
