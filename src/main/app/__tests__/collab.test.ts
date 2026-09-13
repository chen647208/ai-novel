/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeSocket {
  url: string;
  readyState: number;
  sent: string[];
  closed: boolean;
  handlers: Map<string, (...args: unknown[]) => void>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  send(data: string): void;
  close(): void;
  emit(event: string, ...args: unknown[]): void;
}

const ipc = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  return {
    handlers,
    handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown): void => {
      handlers.set(channel, handler);
    },
  };
});

const sockets = vi.hoisted(() => {
  const created: FakeSocket[] = [];
  class FakeWebSocket {
    static OPEN = 1;
    url: string;
    readyState = 1;
    sent: string[] = [];
    closed = false;
    handlers = new Map<string, (...args: unknown[]) => void>();
    constructor(url: string) {
      this.url = url;
      created.push(this);
    }
    on(event: string, handler: (...args: unknown[]) => void): void {
      this.handlers.set(event, handler);
    }
    send(data: string): void {
      this.sent.push(data);
    }
    close(): void {
      this.closed = true;
    }
    emit(event: string, ...args: unknown[]): void {
      this.handlers.get(event)?.(...args);
    }
  }
  return { created, WebSocket: FakeWebSocket };
});

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle } }));
vi.mock('ws', () => ({ WebSocket: sockets.WebSocket }));

import { IPC } from '../../channels.js';
import { collabProvider } from '../collab.js';
import type { ProviderContext } from '../container.js';

const ctx: ProviderContext = { getMainWindow: () => null };

function sender() {
  return { isDestroyed: () => false, send: vi.fn() };
}

function invoke(channel: string, event: unknown, ...args: unknown[]): unknown {
  const handler = ipc.handlers.get(channel);
  return handler?.(event, ...args);
}

describe('collabProvider', () => {
  beforeEach(() => {
    ipc.handlers.clear();
    sockets.created.length = 0;
    void collabProvider.boot(ctx);
  });

  it('拒绝非 ws/wss 地址', () => {
    const event = { sender: sender() };
    expect(invoke(IPC.collab.open, event, 'http://x')).toEqual({ ok: false, error: 'invalid-url' });
    expect(invoke(IPC.collab.open, event, 42)).toEqual({ ok: false, error: 'invalid-url' });
    expect(sockets.created).toHaveLength(0);
  });

  it('打开连接并转发收到的消息', () => {
    const event = { sender: sender() };
    const result = invoke(IPC.collab.open, event, 'ws://localhost:1234') as { ok: boolean; id: string };
    expect(result.ok).toBe(true);
    const socket = sockets.created[0];
    expect(socket?.url).toBe('ws://localhost:1234');

    socket?.emit('message', Buffer.from(JSON.stringify({ type: 'update', room: 'r' })));
    expect(event.sender.send).toHaveBeenCalledWith(IPC.collab.message, result.id, { type: 'update', room: 'r' });

    socket?.emit('message', 'not-json');
    expect(event.sender.send).toHaveBeenCalledTimes(1);

    socket?.emit('close');
    expect(event.sender.send).toHaveBeenCalledWith(IPC.collab.message, result.id, { type: 'closed' });
  });

  it('send 仅对已打开连接生效', () => {
    const event = { sender: sender() };
    expect(invoke(IPC.collab.send, event, 'missing', {})).toEqual({ ok: false });

    const result = invoke(IPC.collab.open, event, 'ws://localhost:1234') as { id: string };
    expect(invoke(IPC.collab.send, event, result.id, { type: 'update' })).toEqual({ ok: true });
    expect(sockets.created[0]?.sent).toEqual([JSON.stringify({ type: 'update' })]);

    if (sockets.created[0]) sockets.created[0].readyState = 0;
    expect(invoke(IPC.collab.send, event, result.id, { type: 'update' })).toEqual({ ok: false });
    expect(invoke(IPC.collab.send, event, 123, {})).toEqual({ ok: false });
  });

  it('close 关闭连接', () => {
    const event = { sender: sender() };
    const result = invoke(IPC.collab.open, event, 'wss://example.com') as { id: string };
    expect(invoke(IPC.collab.close, event, result.id)).toEqual({ ok: true });
    expect(sockets.created[0]?.closed).toBe(true);
    expect(invoke(IPC.collab.close, event, result.id)).toEqual({ ok: true });
    expect(invoke(IPC.collab.close, event, 5)).toEqual({ ok: false });
  });

  it('shutdown 关闭全部连接', () => {
    const event = { sender: sender() };
    invoke(IPC.collab.open, event, 'ws://localhost:1234');
    void collabProvider.shutdown?.(ctx);
    expect(sockets.created[0]?.closed).toBe(true);
  });
});
