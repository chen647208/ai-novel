/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { generateKeyPairSync, sign } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parseSignatureEnvelope, sha256Base64, verifyEd25519 } from '../pluginSignature.js';

function keypair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

describe('pluginSignature（S4 签名校验）', () => {
  it('合法签名通过，篡改内容失败', () => {
    const { publicKey, privateKey } = keypair();
    const content = '{"id":"com.a.b"}';
    const signature = sign(null, Buffer.from(content), privateKey).toString('base64');
    expect(verifyEd25519(content, signature, publicKey)).toBe(true);
    expect(verifyEd25519('{"id":"tampered"}', signature, publicKey)).toBe(false);
  });

  it('错误公钥失败', () => {
    const a = keypair();
    const b = keypair();
    const content = 'x';
    const signature = sign(null, Buffer.from(content), a.privateKey).toString('base64');
    expect(verifyEd25519(content, signature, b.publicKey)).toBe(false);
  });

  it('sha256 快照稳定', () => {
    expect(sha256Base64('abc')).toBe(sha256Base64('abc'));
    expect(sha256Base64('abc')).not.toBe(sha256Base64('abd'));
  });

  it('解析签名信封', () => {
    const envelope = { algorithm: 'ed25519', signature: 's', publicKey: 'p' };
    expect(parseSignatureEnvelope(JSON.stringify(envelope))).toEqual(envelope);
    expect(parseSignatureEnvelope('{"algorithm":"rsa"}')).toBeUndefined();
    expect(parseSignatureEnvelope('not json')).toBeUndefined();
  });
});
