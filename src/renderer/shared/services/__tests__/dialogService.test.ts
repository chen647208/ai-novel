/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { dialogService } from '../dialogService';

describe('dialogService', () => {
  afterEach(() => { dialogService.clear(); });

  it('confirm：settle(true) 解析为 true，settle(false) 解析为 false', async () => {
    const a = dialogService.confirm('删掉？');
    dialogService.settle(true);
    expect(await a).toBe(true);

    const b = dialogService.confirm({ message: '删掉？', danger: true });
    dialogService.settle(false);
    expect(await b).toBe(false);
  });

  it('alert：settle 后解析（忽略 value）', async () => {
    const p = dialogService.alert('生成成功');
    dialogService.settle(true);
    await expect(p).resolves.toBeUndefined();
  });

  it('prompt：确认返回输入文本，取消返回 null', async () => {
    const a = dialogService.prompt({ message: '书名？', defaultValue: '默认' });
    dialogService.settle(true, '我的新书');
    expect(await a).toBe('我的新书');

    const b = dialogService.prompt('再问一次');
    dialogService.settle(false);
    expect(await b).toBeNull();
  });

  it('prompt：确认但未提供文本时回执空串', async () => {
    const p = dialogService.prompt('输入：');
    dialogService.settle(true);
    expect(await p).toBe('');
  });

  it('多个请求按 FIFO 队列逐个回执', async () => {
    const first = dialogService.confirm('一');
    const second = dialogService.confirm('二');
    dialogService.settle(true);  // 完成队首“一”
    expect(await first).toBe(true);
    dialogService.settle(false); // 完成“二”
    expect(await second).toBe(false);
  });

  it('subscribe 立即收到快照，并在队列变化时再次收到', () => {
    const seen: number[] = [];
    const unsub = dialogService.subscribe((q) => seen.push(q.length));
    expect(seen).toEqual([0]); // 立即回调
    dialogService.alert('提示');
    expect(seen[seen.length - 1]).toBe(1);
    dialogService.settle(true);
    expect(seen[seen.length - 1]).toBe(0);
    unsub();
    dialogService.alert('再来');
    expect(seen[seen.length - 1]).toBe(0); // 取消订阅后不再收到
  });

  it('clear 以“取消”回执所有挂起请求', async () => {
    const p = dialogService.confirm('挂起');
    const q = dialogService.prompt('挂起的输入');
    dialogService.clear();
    expect(await p).toBe(false);
    expect(await q).toBeNull();
  });
});
