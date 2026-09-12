/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { mkdir,mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { pluginListDirectory, pluginReadFile, resolvePluginPath } from '../pluginFs.js';

describe('pluginFs（§11.2 realpath 包含门）', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'hongyue-pluginfs-'));
    await mkdir(path.join(root, 'skills'), { recursive: true });
    await writeFile(path.join(root, 'skills', 'ok.md'), '# ok', 'utf-8');
    await mkdir(path.join(root, 'node_modules'), { recursive: true });
    await writeFile(path.join(root, 'node_modules', 'x.js'), 'x', 'utf-8');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('授权根内文件可读、目录可列', async () => {
    await expect(pluginReadFile(root, 'skills/ok.md')).resolves.toBe('# ok');
    await expect(pluginListDirectory(root, 'skills')).resolves.toEqual([{ name: 'ok.md', type: 'file' }]);
  });

  it('拒绝绝对路径与 .. 越界', async () => {
    await expect(resolvePluginPath(root, '/etc/passwd')).rejects.toThrow('非法');
    await expect(resolvePluginPath(root, '../escape.md')).rejects.toThrow('非法');
  });

  it('拒绝清单命中（node_modules）', async () => {
    await expect(resolvePluginPath(root, 'node_modules/x.js')).rejects.toThrow('拒绝清单');
  });

  it('目标不存在时抛错（realpath ENOENT）', async () => {
    await expect(resolvePluginPath(root, 'skills/missing.md')).rejects.toThrow();
  });

  it('符号链接指向授权根外时拒绝（平台不支持则跳过）', async () => {
    const outside = await mkdtemp(path.join(tmpdir(), 'hongyue-pluginfs-out-'));
    try {
      await writeFile(path.join(outside, 'secret.txt'), 'secret', 'utf-8');
      try {
        await symlink(outside, path.join(root, 'link'), 'dir');
      } catch {
        return; // Windows 无权限建符号链接：跳过该断言
      }
      await expect(resolvePluginPath(root, 'link/secret.txt')).rejects.toThrow('越界');
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
