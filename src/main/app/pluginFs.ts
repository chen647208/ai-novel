/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件文件访问代理（docs/design/04 §11.2 的 realpath 包含门）。
 *
 * 一切插件贡献资源的读取经此代理：先做相对路径词法校验，再对目标做 `fs.realpath`
 * 解析符号链接，要求解析结果仍落在授权根内且不含拒绝清单段。插件拿不到原生 `fs`。
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { ipcMain } from 'electron';

import { hasDeniedPluginSegment, isUnsafePluginRel } from '../../shared/constants/pluginPaths.js';
import { IPC } from '../channels.js';

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !value) throw new TypeError(`Invalid ${name}: expected non-empty string`);
}

/**
 * 解析插件根内的相对路径：词法两道门 + realpath 包含。
 * 目标必须存在；越界或命中拒绝清单即抛错。
 */
export async function resolvePluginPath(rootDir: string, rel: string): Promise<string> {
  assertString(rootDir, 'rootDir');
  assertString(rel, 'rel');
  if (isUnsafePluginRel(rel)) throw new Error(`非法插件相对路径：${rel}`);
  if (hasDeniedPluginSegment(rel)) throw new Error(`命中拒绝清单：${rel}`);
  const rootReal = await fs.realpath(rootDir);
  const target = path.resolve(rootReal, rel);
  const targetReal = await fs.realpath(target);
  const relative = path.relative(rootReal, targetReal);
  if (relative !== '' && (relative.startsWith('..') || path.isAbsolute(relative))) {
    throw new Error(`路径越界（realpath 落在授权根外）：${rel}`);
  }
  if (hasDeniedPluginSegment(relative)) throw new Error(`命中拒绝清单：${rel}`);
  return targetReal;
}

/** 经门读取插件资源文本。 */
export async function pluginReadFile(rootDir: string, rel: string): Promise<string> {
  const target = await resolvePluginPath(rootDir, rel);
  return fs.readFile(target, 'utf-8');
}

/** 经门读取插件二进制资源（base64；WASM 模块等）。 */
export async function pluginReadBinary(rootDir: string, rel: string): Promise<string> {
  const target = await resolvePluginPath(rootDir, rel);
  const content = await fs.readFile(target);
  return content.toString('base64');
}

/** 经门列目录（只返回名字与类型）。 */
export async function pluginListDirectory(
  rootDir: string,
  rel: string,
): Promise<Array<{ name: string; type: 'file' | 'directory' }>> {
  const target = await resolvePluginPath(rootDir, rel);
  const entries = await fs.readdir(target, { withFileTypes: true });
  return entries.map((entry) => ({ name: entry.name, type: entry.isDirectory() ? 'directory' : 'file' }));
}

/** 注册插件 fs 代理 IPC（主进程启动时调用一次）。 */
export function registerPluginFsIpc(): void {
  ipcMain.handle(IPC.pluginReadFile, (_event, rootDir: string, rel: string) => pluginReadFile(rootDir, rel));
  ipcMain.handle(IPC.pluginReadBinary, (_event, rootDir: string, rel: string) => pluginReadBinary(rootDir, rel));
  ipcMain.handle(IPC.pluginListDirectory, (_event, rootDir: string, rel: string) => pluginListDirectory(rootDir, rel));
}
