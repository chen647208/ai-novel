/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { type AppInfo,collectDiagnostics, collectHealth } from '../diagnosticsCore.js';

const info: AppInfo = {
  name: '红月创作', version: '1.0.0', electron: '44', chrome: '152', node: '24', platform: 'win32', arch: 'x64',
};

describe('collectDiagnostics', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hongyue-diag-'));
    await fs.mkdir(path.join(dir, 'logs'), { recursive: true });
    await fs.writeFile(path.join(dir, 'logs', 'main-2026-09-10.log'), 'line1\nline2');
    await fs.writeFile(path.join(dir, 'window-state.json'), '{"width":1400}');
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('收 app-info + logs + window-state，缺席文件跳过', async () => {
    const files = await collectDiagnostics(dir, info);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['app-info.json', 'logs/main-2026-09-10.log', 'window-state.json']),
    );
    expect(files['logs/main-2026-09-10.log']).toBe('line1\nline2');
    const parsed = JSON.parse(files['app-info.json']!);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.userData).toBe(dir);
    // storage-config.json 不存在 → 不收，且不报错
    expect(files['storage-config.json']).toBeUndefined();
  });

  it('目录不存在也不抛错', async () => {
    const files = await collectDiagnostics(path.join(dir, 'nope'), info);
    expect(files['app-info.json']).toBeTruthy();
    expect(files['health.json']).toBeTruthy();
    expect(Object.keys(files)).toHaveLength(2);
  });
});

describe('collectHealth', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hongyue-health-'));
    await fs.mkdir(path.join(dir, 'logs'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('正常目录：可写 + 日志目录通过，缺配置文件视为正常', async () => {
    const items = await collectHealth(dir);
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId.userDataWritable?.ok).toBe(true);
    expect(byId.logsDir?.ok).toBe(true);
    expect(byId.storageConfig?.ok).toBe(true);
  });

  it('损坏的 storage-config：标记不通过', async () => {
    await fs.writeFile(path.join(dir, 'storage-config.json'), '{ not json');
    const items = await collectHealth(dir);
    expect(items.find((i) => i.id === 'storageConfig')?.ok).toBe(false);
  });
});
