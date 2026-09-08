/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { MinimalMcpClient } from '../client.js';

/** 内联 mock MCP server（node -e）：initialize + tools/list + tools/call。 */
const MOCK_SERVER = `
const rl = require('readline').createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.id === undefined) return;
  const respond = (result) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\\n');
  if (msg.method === 'initialize') respond({ protocolVersion: '2025-03-26', serverInfo: { name: 'mock' } });
  else if (msg.method === 'tools/list') respond({ tools: [{ name: 'echo', description: '回声测试', inputSchema: { type: 'object', properties: {} } }] });
  else if (msg.method === 'tools/call') respond({ content: [{ type: 'text', text: 'echo:' + JSON.stringify(msg.params?.arguments ?? {}) }] });
  else respond({ error: { message: 'unknown: ' + msg.method } });
});
`;

describe('MinimalMcpClient', () => {
  it('握手 + 列表 + 调用全链路', async () => {
    const client = new MinimalMcpClient(process.execPath, ['-e', MOCK_SERVER], 10000);
    try {
      await client.start();
      const tools = await client.listTools();
      expect(tools.map((t) => t.name)).toEqual(['echo']);
      const res = (await client.callTool('echo', { a: 1 })) as { content: Array<{ text: string }> };
      expect(res.content[0]?.text).toContain('"a":1');
    } finally {
      await client.close();
    }
  });

  it('不存在的命令启动失败', async () => {
    const client = new MinimalMcpClient('hongyue-definitely-not-a-binary-xyz', [], 3000);
    await expect(client.start()).rejects.toThrow();
    await client.close();
  });
});
