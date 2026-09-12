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
import { spawnSync } from 'node:child_process';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export { parseSignatureEnvelope,type PluginSignatureEnvelope } from '../../shared/pluginSignature.js';

/** 内容 sha256（base64）：完整性快照。 */
export function sha256Base64(content: Uint8Array | string): string {
  return createHash('sha256').update(content).digest('base64');
}

/** 内容摘要是否与信封一致（sha256 信封的完整性校验）。 */
export function sha256Matches(content: Uint8Array | string, digestBase64: string): boolean {
  return sha256Base64(content) === digestBase64;
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

/** cosign 可执行文件：优先环境变量 `HONGYUE_COSIGN_BIN`，否则 PATH 上的 `cosign`。 */
export function resolveCosignBin(): string {
  const override = typeof process.env.HONGYUE_COSIGN_BIN === 'string' ? process.env.HONGYUE_COSIGN_BIN.trim() : '';
  return override.length > 0 ? override : 'cosign';
}

/** cosign 是否可用（外部工具链，缺失时 cosign 信封一律拒绝）。 */
export function cosignAvailable(): boolean {
  try {
    return spawnSync(resolveCosignBin(), ['version'], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

export interface CosignVerifyInput {
  /** cosign bundle（JSON）的 base64。 */
  bundle: string;
  /** key 模式验证公钥（PEM）。 */
  publicKey?: string;
  /** keyless 模式：期望证书身份。 */
  certificateIdentity?: string;
  /** keyless 模式：期望 OIDC 签发方。 */
  certificateOidcIssuer?: string;
}

/** cosign verify-blob 参数（各为临时文件路径）。 */
export function buildCosignVerifyArgs(paths: {
  blob: string;
  bundle: string;
  publicKey?: string;
  certificateIdentity?: string;
  certificateOidcIssuer?: string;
}): string[] {
  const args = ['verify-blob', '--bundle', paths.bundle];
  if (paths.publicKey) args.push('--key', paths.publicKey);
  if (paths.certificateIdentity) args.push('--certificate-identity', paths.certificateIdentity);
  if (paths.certificateOidcIssuer) args.push('--certificate-oidc-issuer', paths.certificateOidcIssuer);
  args.push(paths.blob);
  return args;
}

/** 用 cosign bundle 校验 blob；缺少信任锚、cosign 不存在或校验失败均返回 false。 */
export function verifyCosignBlob(content: Uint8Array | string, input: CosignVerifyInput): boolean {
  const hasAnchor = !!input.publicKey || (!!input.certificateIdentity && !!input.certificateOidcIssuer);
  if (!hasAnchor || !cosignAvailable()) return false;
  let dir: string | undefined;
  try {
    dir = mkdtempSync(join(tmpdir(), 'hy-cosign-'));
    const blob = join(dir, 'plugin.json');
    const bundle = join(dir, 'plugin.bundle');
    writeFileSync(blob, typeof content === 'string' ? Buffer.from(content, 'utf-8') : content);
    writeFileSync(bundle, Buffer.from(input.bundle, 'base64'));
    let publicKeyPath: string | undefined;
    if (input.publicKey) {
      publicKeyPath = join(dir, 'cosign.pub');
      writeFileSync(publicKeyPath, input.publicKey);
    }
    const result = spawnSync(
      resolveCosignBin(),
      buildCosignVerifyArgs({
        blob,
        bundle,
        publicKey: publicKeyPath,
        certificateIdentity: input.certificateIdentity,
        certificateOidcIssuer: input.certificateOidcIssuer,
      }),
      { stdio: 'ignore' },
    );
    return result.status === 0;
  } catch {
    return false;
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}
