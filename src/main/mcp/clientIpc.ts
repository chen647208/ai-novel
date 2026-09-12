/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * MCP 客户端 IPC（docs/design/14）：渲染层管理外部 MCP server，
 * 主进程持有 stdio 连接（子进程生命周期跟随应用）。
 * 连接数上限 8；spawn 前须经系统原生对话框由用户批准（防渲染层被控拉起任意进程），
 * 参数以数组传参、不经 shell 展开。
 */
import { dialog,ipcMain } from 'electron';

import { getMainWindow } from '../app/window.js';
import { IPC } from '../channels.js';
import { logger } from '../logger.js';
import { type McpToolDef,MinimalMcpClient } from './client.js';
import { approveMcpCommand,isMcpCommandApproved, mcpFingerprint } from './commandApproval.js';
import { dispatch } from './server.js';

const MAX_CLIENTS = 8;
/** 内置 MCP server 的 id：进程内直连 server.ts 的 dispatch（自举：助手吃自己的 MCP）。 */
const BUILTIN_ID = 'builtin';

interface McpClientHandle {
  start(): Promise<void>;
  listTools(): Promise<McpToolDef[]>;
  callTool(tool: string, args: unknown): Promise<unknown>;
  close(): Promise<void>;
}

class InProcessMcpClient implements McpClientHandle {
  async start(): Promise<void> {
    // 进程内无需握手
  }

  async listTools(): Promise<McpToolDef[]> {
    const res = dispatch('tools/list', {}) as { tools?: McpToolDef[] };
    return res.tools ?? [];
  }

  async callTool(tool: string, args: unknown): Promise<unknown> {
    return dispatch('tools/call', { name: tool, arguments: (args ?? {}) as Record<string, unknown> });
  }

  async close(): Promise<void> {
    // 进程内无需释放
  }
}

const clients = new Map<string, McpClientHandle>();

async function getClient(id: string): Promise<McpClientHandle> {
  const client = clients.get(id);
  if (!client) throw new Error(`MCP server 未连接：${id}`);
  return client;
}

export function registerMcpClientIpc(): void {
  // 连接（幂等：已连则复用）；builtin 用进程内直连，不 spawn 子进程
  ipcMain.handle(IPC.mcp.clientConnect, async (_event, id: string, command: string, args?: string[]) => {
    if (typeof id !== 'string' || typeof command !== 'string' || !id || !command) {
      throw new TypeError('Invalid mcp:client-connect arguments');
    }
    if (Array.isArray(args) && !args.every((a) => typeof a === 'string')) {
      throw new TypeError('Invalid mcp:client-connect arguments');
    }
    const existing = clients.get(id);
    if (existing) return { connected: true as const };
    if (id === BUILTIN_ID) {
      clients.set(id, new InProcessMcpClient());
      return { connected: true as const };
    }
    if (clients.size >= MAX_CLIENTS) {
      throw new Error(`MCP 连接数上限 ${MAX_CLIENTS}`);
    }
    // 启动审批：未批准的 command+args 先经系统原生对话框确认，批准后持久化
    const fingerprint = mcpFingerprint(command, args ?? []);
    if (!isMcpCommandApproved(fingerprint)) {
      const options = {
        type: 'warning' as const,
        buttons: ['拒绝', '允许'],
        defaultId: 1,
        cancelId: 0,
        title: 'MCP 服务器',
        message: '允许启动该 MCP 服务器进程吗？',
        detail: `${command} ${(args ?? []).join(' ')}`.trim(),
      };
      const parent = getMainWindow();
      const { response } = parent
        ? await dialog.showMessageBox(parent, options)
        : await dialog.showMessageBox(options);
      if (response !== 1) throw new Error('用户未批准该 MCP 服务器');
      approveMcpCommand(fingerprint);
    }
    const client = new MinimalMcpClient(command, args ?? []);
    try {
      await client.start();
    } catch (error) {
      await client.close().catch(() => {});
      throw error instanceof Error ? error : new Error(String(error));
    }
    clients.set(id, client);
    return { connected: true as const };
  });

  // 工具列表
  ipcMain.handle(IPC.mcp.clientTools, async (_event, id: string): Promise<{ tools: McpToolDef[] }> => {
    const client = await getClient(id);
    return { tools: await client.listTools() };
  });

  // 工具调用（审批在渲染端工具管线完成，此处只透传）
  ipcMain.handle(IPC.mcp.clientCall, async (_event, id: string, tool: string, toolArgs?: unknown) => {
    const client = await getClient(id);
    if (typeof tool !== 'string' || !tool) throw new TypeError('Invalid tool name');
    return client.callTool(tool, toolArgs ?? {});
  });

  // 断开
  ipcMain.handle(IPC.mcp.clientDisconnect, async (_event, id: string) => {
    const client = clients.get(id);
    clients.delete(id);
    if (client) await client.close().catch((err: unknown) => logger.warn('mcp', '断开失败', err));
    return { connected: false as const };
  });
}

/** 退出时关闭全部 MCP 子进程。 */
export async function closeMcpClients(): Promise<void> {
  for (const [id, client] of clients) {
    clients.delete(id);
    await client.close().catch((err: unknown) => logger.warn('mcp', '退出清理失败', err));
  }
}
