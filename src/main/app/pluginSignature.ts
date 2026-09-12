/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件包签名校验（docs/design/21 §6 S4）。
 *
 * 签名信封 `plugin.sig`：`{ algorithm: 'ed25519', signature: base64, publicKey: PEM }`。
 * 校验内容为 `plugin.json` 原始字节；publicKey 还必须命中宿主信任键白名单（否则拒载）。
 */

import { Buffer } from 'node:buffer';
import { createHash, createPublicKey, verify } from 'node:crypto';

export { parseSignatureEnvelope,type PluginSignatureEnvelope } from '../../shared/pluginSignature.js';

/** 内容 sha256（base64）：完整性快照。 */
export function sha256Base64(content: Uint8Array | string): string {
  return createHash('sha256').update(content).digest('base64');
}

/** 校验 detached Ed25519 签名。 */
export function verifyEd25519(
  content: Uint8Array | string,
  signatureBase64: string,
  publicKeyPem: string,
): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return verify(null, data, key, Buffer.from(signatureBase64, 'base64'));
  } catch {
    return false;
  }
}
