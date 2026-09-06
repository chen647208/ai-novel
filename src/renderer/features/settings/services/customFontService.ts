/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { CustomFontMeta } from '../../../../shared/types';
import { useSettingsStore } from '../../../app/stores/settingsStore';

const FONT_DIR = 'fonts';
const ACCEPT_EXT = ['ttf', 'otf', 'woff', 'woff2'] as const;
type FontExt = (typeof ACCEPT_EXT)[number];

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

type ElectronAPI = NonNullable<Window['electronAPI']>;

function api(): ElectronAPI {
  const a = typeof window !== 'undefined' ? window.electronAPI : undefined;
  if (!a) throw new Error('需要桌面环境');
  return a;
}

function fontPath(fileName: string): string {
  // 与 storage.ts 一致：appData 下相对路径用 / 连接（含 Windows）
  return `${FONT_DIR}/${fileName}`;
}

async function appDataPath(): Promise<string> {
  return api().getAppDataPath();
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** 向 document 注册一份已解码的字形（jsdom/无 FontFace 环境直接跳过）。 */
export async function registerFontFace(name: string, data: Uint8Array): Promise<boolean> {
  try {
    if (typeof FontFace === 'undefined') return false;
    const face = new FontFace(name, data);
    await face.load();
    document.fonts.add(face);
    return true;
  } catch {
    return false;
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? '');
      const comma = url.indexOf(',');
      resolve(comma >= 0 ? url.slice(comma + 1) : url);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * 导入自定义字体：<input type=file> 拿 File（不碰主进程 IPC 新接口），
 * base64 存用户数据目录，元数据进 settingsStore（走持久化桥），当场注册生效。
 */
export async function importCustomFont(file: File): Promise<CustomFontMeta> {
  if (!isElectron()) throw new Error('导入字体需要桌面环境');
  const ext = (file.name.split('.').pop() ?? '').toLowerCase() as FontExt;
  if (!(ACCEPT_EXT as readonly string[]).includes(ext)) {
    throw new Error(`仅支持 ${ACCEPT_EXT.join(' / ')}，当前：${file.name}`);
  }
  if (file.size > 64 * 1024 * 1024) throw new Error('字体文件过大（>64MB），请确认文件无误');
  const base64 = await readFileAsBase64(file);
  const store = useSettingsStore.getState();
  const baseName = file.name.replace(/\.[^.]+$/, '').trim() || `字体${Date.now()}`;
  // 同名复用同一家族名，避免 @font-face 重名堆积
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 0xffff).toString(36)}`;
  const fileName = `${id}.${ext}`;
  const base = await appDataPath();
  await api().writeFile(`${base}/${fontPath(fileName)}`, base64);
  const meta: CustomFontMeta = { id, name: baseName, fileName, format: ext };
  store.addCustomFont(meta);
  await registerFontFace(meta.name, base64ToBytes(base64));
  return meta;
}

export async function removeCustomFont(id: string): Promise<void> {
  const store = useSettingsStore.getState();
  const meta = store.customFonts.find((c) => c.id === id);
  store.removeCustomFont(id);
  if (meta && isElectron()) {
    try {
      const base = await appDataPath();
      await api().unlink(`${base}/${fontPath(meta.fileName)}`);
    } catch {
      // 文件删不掉不影响元数据删除
    }
  }
}

/** 启动期把已导入字体逐个读回注册；失败逐个跳过不挡启动。 */
export async function bootCustomFonts(): Promise<void> {
  if (!isElectron()) return;
  const { customFonts } = useSettingsStore.getState();
  if (customFonts.length === 0) return;
  const base = await appDataPath();
  const electron = api();
  for (const meta of customFonts) {
    try {
      const exists = await electron.exists(`${base}/${fontPath(meta.fileName)}`);
      if (!exists) continue;
      const base64 = await electron.readFile(`${base}/${fontPath(meta.fileName)}`);
      await registerFontFace(meta.name, base64ToBytes(base64));
    } catch {
      continue;
    }
  }
}

export { bytesToBase64, base64ToBytes };
