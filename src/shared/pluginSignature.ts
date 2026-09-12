/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件签名信封（跨层单源）。加解密校验在主进程（`main/app/pluginSignature.ts`）。
 */

export interface PluginSignatureEnvelope {
  algorithm: 'ed25519';
  signature: string;
  publicKey: string;
}

/** 解析签名信封；缺字段或非 ed25519 返回 undefined。 */
export function parseSignatureEnvelope(raw: string): PluginSignatureEnvelope | undefined {
  try {
    const parsed = JSON.parse(raw) as Partial<PluginSignatureEnvelope>;
    if (parsed.algorithm !== 'ed25519') return undefined;
    if (typeof parsed.signature !== 'string' || typeof parsed.publicKey !== 'string') return undefined;
    return { algorithm: 'ed25519', signature: parsed.signature, publicKey: parsed.publicKey };
  } catch {
    return undefined;
  }
}
