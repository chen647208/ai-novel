/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件签名信封（跨层单源）。校验在主进程（`main/app/pluginSignature.ts`）。
 *
 * - `ed25519`：detached 签名 + PEM 公钥（须命中信任键白名单）；提供来源认证。
 * - `sha256`：内容摘要；仅完整性，不提供来源认证，故不放开可执行贡献。
 * - `cosign`：Sigstore/cosign 签名 + 证书；由主进程调用外部 cosign 校验。
 */

export interface Ed25519SignatureEnvelope {
  algorithm: 'ed25519';
  signature: string;
  publicKey: string;
}

export interface Sha256SignatureEnvelope {
  algorithm: 'sha256';
  digest: string;
}

export interface CosignSignatureEnvelope {
  algorithm: 'cosign';
  signature: string;
  certificate: string;
}

export type PluginSignatureEnvelope = Ed25519SignatureEnvelope | Sha256SignatureEnvelope | CosignSignatureEnvelope;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** 解析签名信封；算法未知或缺必要字段返回 undefined。 */
export function parseSignatureEnvelope(raw: string): PluginSignatureEnvelope | undefined {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    switch (parsed.algorithm) {
      case 'ed25519':
        if (!isNonEmptyString(parsed.signature) || !isNonEmptyString(parsed.publicKey)) return undefined;
        return { algorithm: 'ed25519', signature: parsed.signature, publicKey: parsed.publicKey };
      case 'sha256':
        if (!isNonEmptyString(parsed.digest)) return undefined;
        return { algorithm: 'sha256', digest: parsed.digest };
      case 'cosign':
        if (!isNonEmptyString(parsed.signature) || !isNonEmptyString(parsed.certificate)) return undefined;
        return { algorithm: 'cosign', signature: parsed.signature, certificate: parsed.certificate };
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}
