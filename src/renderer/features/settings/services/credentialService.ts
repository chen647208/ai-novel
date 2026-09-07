/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { EmbeddingModelConfig, ModelConfig } from '../../../../shared/types';

/**
 * 渲染端凭证门面：持久化只存 `vault:<id>` 引用，明文只活在编辑态内存。
 *
 * - 保存时 persistApiKey 明文→vault:set→引用；vault 不可用（无钥匙串/浏览器预览）
 *   则原样返回明文并由调用方提示（绝不静默假装加密）；
 * - 拉表/测连等渲染端直连场景用 resolveApiKey 解引用；
 * - 生成走主进程网关，由网关统一解引用，渲染端无需经手。
 */

export const VAULT_REF_PREFIX = 'vault:';

export function isVaultRef(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith(VAULT_REF_PREFIX) && value.length > VAULT_REF_PREFIX.length;
}

export async function isVaultAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.electronAPI?.vault) return false;
    return await window.electronAPI.vault.isAvailable();
  } catch {
    return false;
  }
}

/** 明文入库：返回可持久化的值（引用或原文）与是否真正加密。 */
export async function persistApiKey(
  id: string,
  plaintext: string | undefined
): Promise<{ stored: string | undefined; encrypted: boolean }> {
  if (!plaintext) return { stored: undefined, encrypted: true };
  if (isVaultRef(plaintext)) return { stored: plaintext, encrypted: true };
  try {
    if (typeof window === 'undefined' || !window.electronAPI?.vault) {
      return { stored: plaintext, encrypted: false };
    }
    await window.electronAPI.vault.set(id, plaintext);
    return { stored: `${VAULT_REF_PREFIX}${id}`, encrypted: true };
  } catch {
    return { stored: plaintext, encrypted: false };
  }
}

/** 解引用：引用→vault:get，明文→原样，无 key→undefined。 */
export async function resolveApiKey(
  apiKey: string | undefined,
  fallbackId?: string
): Promise<string | undefined> {
  if (!apiKey) return undefined;
  if (!isVaultRef(apiKey)) return apiKey;
  const id = fallbackId ?? apiKey.slice(VAULT_REF_PREFIX.length);
  try {
    if (typeof window === 'undefined' || !window.electronAPI?.vault) return undefined;
    return (await window.electronAPI.vault.get(id)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function removeApiKey(id: string): Promise<void> {
  try {
    await window.electronAPI?.vault.remove(id);
  } catch {
    // 删除幂等：vault 不可用或无该 key 都视为成功
  }
}

/** 模型配置的 Key 解引用（拉表/测连等渲染端直连前调用）。 */
export async function resolveModelApiKey(model: ModelConfig): Promise<string | undefined> {
  return resolveApiKey(model.apiKey, model.id);
}

/** 向量配置的 Key 解引用。 */
export async function resolveEmbeddingApiKey(config: EmbeddingModelConfig): Promise<string | undefined> {
  return resolveApiKey(config.apiKey, config.id);
}
