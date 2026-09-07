/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { app, ipcMain, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../logger.js';
import { IPC } from '../channels.js';
import type { Provider } from './container.js';
import type { ModelConfig } from '../../shared/types.js';

/**
 * 安全密钥库：API Key 落盘加密（对标 CC Switch 安全复盘“本地≠加密”的教训）。
 *
 * - 可用时走 Electron safeStorage（OS 钥匙串：Windows DPAPI / macOS Keychain /
 *   Linux Secret Service），密文存 userData/vault.json；
 * - 不可用时（无桌面钥匙串）显式抛 VAULT_UNAVAILABLE，渲染端回落明文并横幅提示，
 *   绝不静默降级假装安全；
 * - 渲染端持久化只存 `vault:<id>` 引用。网关在主进程统一解引用后才调适配器，
 *   让 README“Key 不进渲染端”从口号变成事实（编辑态内存明文除外，见 credentialService）。
 */

export const VAULT_REF_PREFIX = 'vault:';
export const VAULT_UNAVAILABLE = 'VAULT_UNAVAILABLE';

export function isVaultRef(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith(VAULT_REF_PREFIX) && value.length > VAULT_REF_PREFIX.length;
}

export function vaultIdFor(ref: string): string {
  return ref.slice(VAULT_REF_PREFIX.length);
}

export function isVaultAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function assertId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || id.length === 0 || id.length > 256) {
    throw new TypeError('Invalid vault id');
  }
}

async function vaultFile(): Promise<string> {
  return path.join(app.getPath('userData'), 'vault.json');
}

async function readVault(): Promise<Record<string, string>> {
  let raw: string;
  try {
    raw = await fs.readFile(await vaultFile(), 'utf-8');
  } catch (err) {
    // 首启尚无文件 = 正常缺失；其他 IO 错误（权限/磁盘）必须抛给调用方，不静默
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return {};
    logger.error('vault', 'vault.json 读取失败', err);
    throw err;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    logger.error('vault', 'vault.json 内容不是对象，已视为空保险库');
    return {};
  } catch (err) {
    logger.error('vault', 'vault.json 解析失败', err);
    throw err;
  }
}

async function writeVault(map: Record<string, string>): Promise<void> {
  const file = await vaultFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(map), 'utf-8');
}

/** 存密钥（明文只在本次调用内存出现，落盘即密文）。 */
export async function vaultSet(id: string, plaintext: string): Promise<void> {
  assertId(id);
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new TypeError('Invalid secret');
  }
  if (!isVaultAvailable()) throw new Error(VAULT_UNAVAILABLE);
  const enc = safeStorage.encryptString(plaintext).toString('base64');
  const map = await readVault();
  map[id] = enc;
  await writeVault(map);
}

/** 取密钥：缺失返回 null；文件损坏/IO 异常记日志后同样返回 null（调用方转友好错误，不抛原文）。 */
export async function vaultGet(id: string): Promise<string | null> {
  assertId(id);
  if (!isVaultAvailable()) return null;
  let map: Record<string, string>;
  try {
    map = await readVault();
  } catch (err) {
    logger.error('vault', `读取保险库失败（id=${id}），视为缺失`, err);
    return null;
  }
  const enc = map[id];
  if (!enc) return null;
  try {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'));
  } catch (err) {
    logger.error('vault', `密钥解密失败（id=${id}），请重新填写`, err);
    return null;
  }
}

export async function vaultRemove(id: string): Promise<void> {
  assertId(id);
  const map = await readVault();
  if (id in map) {
    delete map[id];
    await writeVault(map);
  }
}

/** 把模型配置的 apiKey 解引用为明文（网关统一入口；非引用原样返回）。 */
export async function resolveVaultApiKey(apiKey: string | undefined): Promise<string | undefined> {
  if (!apiKey) return undefined;
  if (!isVaultRef(apiKey)) return apiKey;
  return (await vaultGet(vaultIdFor(apiKey))) ?? undefined;
}

export function vaultMissingMessage(): string {
  return 'API Key 无法解密或已丢失，请在设置中重新填写并保存 / API key unavailable (vault missing), please re-enter it in Settings';
}

export const secureStoreProvider: Provider = {
  name: 'secure-store',
  boot() {
    ipcMain.handle(IPC.vault.isAvailable, () => isVaultAvailable());
    ipcMain.handle(IPC.vault.set, async (_event, id: string, plaintext: string) => {
      await vaultSet(id, plaintext);
      return true;
    });
    ipcMain.handle(IPC.vault.get, (_event, id: string) => vaultGet(id));
    ipcMain.handle(IPC.vault.remove, async (_event, id: string) => {
      await vaultRemove(id);
      return true;
    });
  },
};

/** 供网关 handler 复用：解引用失败抛友好错误（complete 直接 reject，stream 转 error 事件）。 */
export async function withVaultKey(model: ModelConfig): Promise<{ ok: true; model: ModelConfig } | { ok: false; error: string }> {
  if (!isVaultRef(model.apiKey)) return { ok: true, model };
  const key = await resolveVaultApiKey(model.apiKey);
  if (!key) return { ok: false, error: vaultMissingMessage() };
  return { ok: true, model: { ...model, apiKey: key } };
}
