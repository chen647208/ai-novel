/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero General Public License 第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ipc = vi.hoisted(() => {
  const handlers = new Map<string, () => void>();
  return {
    handlers,
    on: (ch: string, fn: () => void): void => { handlers.set(ch, fn); },
    removeListener: (ch: string): void => { handlers.delete(ch); },
  };
});

vi.mock('electron', () => ({
  ipcMain: { on: ipc.on, removeListener: ipc.removeListener },
}));

import { requestRendererFlush } from '../flushHandshake.js';
import { IPC } from '../../channels.js';

function fakeWindow(destroyed = false) {
  return {
    isDestroyed: () => destroyed,
    webContents: { send: vi.fn() },
  } as unknown as import('electron').BrowserWindow;
}

describe('requestRendererFlush', () => {
  beforeEach(() => ipc.handlers.clear());

  it('无窗口时立即结束', async () => {
    await expect(requestRendererFlush(() => null)).resolves.toBeUndefined();
  });

  it('窗口已销毁时立即结束', async () => {
    const win = fakeWindow(true);
    await expect(requestRendererFlush(() => win)).resolves.toBeUndefined();
    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  it('发送 flush 请求，收到 flush-done 后结束并解绑', async () => {
    const win = fakeWindow();
    const done = requestRendererFlush(() => win);
    expect(win.webContents.send).toHaveBeenCalledWith(IPC.flushRequest);
    expect(ipc.handlers.has(IPC.flushDone)).toBe(true);
    ipc.handlers.get(IPC.flushDone)?.();
    await expect(done).resolves.toBeUndefined();
    expect(ipc.handlers.has(IPC.flushDone)).toBe(false);
  });

  it('超时后结束', async () => {
    vi.useFakeTimers();
    try {
      const win = fakeWindow();
      const done = requestRendererFlush(() => win, 100);
      await vi.advanceTimersByTimeAsync(100);
      await expect(done).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
