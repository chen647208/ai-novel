/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { ToolRegistry } from '@core/ai';
import { afterEach,describe, expect, it, vi } from 'vitest';

import { syncMcpTools } from '../mcpClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('syncMcpTools（MCP 自举 + 只读直通）', () => {
  it('readOnlyHint 注册为 read，其余走 write:proposal', async () => {
    vi.stubGlobal('window', {
      electronAPI: {
        mcpClient: {
          connect: async () => ({ connected: true }),
          tools: async () => ({
            tools: [
              { name: 'list', description: '只读', annotations: { readOnlyHint: true } },
              { name: 'write', description: '写入', annotations: {} },
            ],
          }),
          call: async () => ({ ok: true }),
          disconnect: async () => ({ connected: false }),
        },
      },
    });
    const registry = new ToolRegistry();
    const { added, errors } = await syncMcpTools(registry, [
      { id: 'builtin', name: '内置 MCP', command: 'builtin', args: [], enabled: true },
    ]);
    expect(errors).toEqual([]);
    expect(added).toBe(2);
    const list = registry.list();
    expect(list.find((t) => t.id === 'mcp.builtin.list')?.permission).toBe('read');
    expect(list.find((t) => t.id === 'mcp.builtin.write')?.permission).toBe('write:proposal');
  });
});
