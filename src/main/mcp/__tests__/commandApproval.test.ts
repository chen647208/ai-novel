/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }));

import { mcpFingerprint } from '../commandApproval.js';

describe('mcpFingerprint', () => {
  it('同命令同参数指纹稳定，参数不同即不同', () => {
    const a = mcpFingerprint('npx', ['-y', 'server']);
    expect(mcpFingerprint('npx', ['-y', 'server'])).toBe(a);
    expect(mcpFingerprint('npx', ['-y', 'other'])).not.toBe(a);
    expect(mcpFingerprint('node', ['-y', 'server'])).not.toBe(a);
  });
});
