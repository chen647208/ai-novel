/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * MCP 客户端服务（docs/design/14）：外部 server 的连接管理 +
 * 工具合并进 ToolRegistry（`mcp.<serverId>.<tool>` 命名空间）。
 * 权限默认 write:proposal（走审批）；readOnlyHint 显式只读才直通。
 */
import type { McpServerConfig } from '@shared/types';
import type { ToolRegistry } from '@core/ai';

export interface McpRemoteTool {
  serverId: string;
  toolId: string;
  name: string;
  description: string;
}

function api() {
  const gateway = window.electronAPI?.mcpClient;
  if (!gateway) throw new Error('MCP 客户端需要 Electron 环境');
  return gateway;
}

/** 工具 id 命名空间化（serverId 与工具名中的点转下划线防歧义）。 */
export function mcpToolId(serverId: string, toolName: string): string {
  const safe = (s: string): string => s.replace(/\./g, '_');
  return `mcp.${safe(serverId)}.${safe(toolName)}`;
}

export async function connectServer(server: McpServerConfig): Promise<void> {
  await api().connect(server.id, server.command, server.args ?? []);
}

export async function disconnectServer(id: string): Promise<void> {
  await api().disconnect(id).catch(() => {});
}

export async function fetchServerTools(server: McpServerConfig): Promise<McpRemoteTool[]> {
  const { tools } = await api().tools(server.id);
  return (tools ?? []).map((t) => ({
    serverId: server.id,
    toolId: mcpToolId(server.id, t.name),
    name: t.name,
    description: t.description ?? '',
  }));
}

/**
 * 同步启用 server 的工具进注册表：先清本 server 旧注册，再按当前列表注册。
 * 执行经 IPC 透传；取消信号不跨进程（以会话中止为准，调用级 signal 忽略）。
 */
export async function syncMcpTools(
  registry: ToolRegistry,
  servers: McpServerConfig[],
): Promise<{ added: number; errors: string[] }> {
  let added = 0;
  const errors: string[] = [];
  for (const server of servers) {
    if (!server.enabled) continue;
    // 清理本 server 上轮注册（改名/删工具后不残留）
    for (const existing of registry.list()) {
      if (existing.id.startsWith(`mcp.${server.id.replace(/\./g, '_')}.`)) {
        registry.unregister(existing.id);
      }
    }
    let remote: McpRemoteTool[];
    try {
      await connectServer(server);
      remote = await fetchServerTools(server);
    } catch (err) {
      errors.push(`${server.name}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (const tool of remote) {
      if (registry.has(tool.toolId)) continue;
      try {
        registry.register({
          id: tool.toolId,
          description: tool.description || tool.name,
          parameters: { type: 'object', properties: {} },
          // 远端工具默认走审批提案；服务端自声明只读提示的不在此区分
          // （MCP annotations 为可选元数据，缺席按可写处理最安全）
          permission: 'write:proposal',
          execute: async (req) => {
            try {
              const data = await api().call(tool.serverId, tool.name, req.args ?? {});
              return { ok: true, data };
            } catch (err) {
              return { ok: false, error: err instanceof Error ? err.message : String(err) };
            }
          },
        });
        added += 1;
      } catch (err) {
        errors.push(`${tool.toolId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  return { added, errors };
}
