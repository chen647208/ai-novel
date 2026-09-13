/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 协作传输：主进程持有 WebSocket 连接，渲染层经 IPC 收发消息。
 * 网络集中在主进程，渲染层不直接建连；仅接受 ws:// 与 wss://。
 */
import { randomUUID } from 'node:crypto';

import { ipcMain, type WebContents } from 'electron';
import { WebSocket } from 'ws';

import { IPC } from '../channels.js';
import type { Provider } from './container.js';

interface Connection {
  socket: WebSocket;
  owner: WebContents;
}

const connections = new Map<string, Connection>();

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
}

function rawToString(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf-8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf-8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf-8');
  return String(data);
}

export const collabProvider: Provider = {
  name: 'collab',
  boot() {
    ipcMain.handle(IPC.collab.open, (event, url: unknown) => {
      if (typeof url !== 'string' || url.length > 2048 || !isAllowedUrl(url)) {
        return { ok: false, error: 'invalid-url' };
      }
      const id = `collab:${randomUUID()}`;
      const sender = event.sender;
      const socket = new WebSocket(url);
      connections.set(id, { socket, owner: sender });
      socket.on('message', (data) => {
        if (sender.isDestroyed()) return;
        try {
          sender.send(IPC.collab.message, id, JSON.parse(rawToString(data)));
        } catch {
          // 非 JSON 消息忽略
        }
      });
      socket.on('close', () => {
        connections.delete(id);
        if (!sender.isDestroyed()) sender.send(IPC.collab.message, id, { type: 'closed' });
      });
      socket.on('error', () => undefined);
      return { ok: true, id };
    });

    ipcMain.handle(IPC.collab.send, (_event, id: unknown, message: unknown) => {
      if (typeof id !== 'string') return { ok: false };
      const connection = connections.get(id);
      if (!connection || connection.socket.readyState !== WebSocket.OPEN) return { ok: false };
      connection.socket.send(JSON.stringify(message));
      return { ok: true };
    });

    ipcMain.handle(IPC.collab.close, (_event, id: unknown) => {
      if (typeof id !== 'string') return { ok: false };
      const connection = connections.get(id);
      if (connection) {
        connection.socket.close();
        connections.delete(id);
      }
      return { ok: true };
    });
  },
  shutdown() {
    for (const { socket } of connections.values()) {
      try {
        socket.close();
      } catch {
        // 已关闭时忽略
      }
    }
    connections.clear();
  },
};
