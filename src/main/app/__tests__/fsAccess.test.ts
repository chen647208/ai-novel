/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach,describe, expect, it } from 'vitest';

import { allowPath,allowRoot, assertPathAllowed, isPathAllowed, resetAllowedPaths } from '../fsAccess.js';

describe('fsAccess 路径门', () => {
  afterEach(() => resetAllowedPaths());

  it('未授权路径被拒', () => {
    resetAllowedPaths();
    expect(isPathAllowed(join(tmpdir(), 'nope', 'x'))).toBe(false);
    expect(() => assertPathAllowed(join(tmpdir(), 'nope', 'x'))).toThrow();
  });

  it('授权根之下的路径放行，越出根拒绝', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fsaccess-'));
    allowRoot(dir);
    expect(isPathAllowed(join(dir, 'a', 'b.txt'))).toBe(true);
    expect(isPathAllowed(join(dir, '..', 'elsewhere'))).toBe(false);
  });

  it('单路径授权只放行该路径', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fsaccess-'));
    const file = join(dir, 'x.txt');
    allowPath(file);
    expect(isPathAllowed(file)).toBe(true);
    expect(isPathAllowed(join(dir, 'y.txt'))).toBe(false);
  });
});
