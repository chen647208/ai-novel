/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskScheduler } from '../taskScheduler';

describe('TaskScheduler（§12.2 周期任务）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('按间隔执行；stop 后停止', async () => {
    const scheduler = new TaskScheduler();
    const run = vi.fn();
    scheduler.register({ id: 't', everyMs: 1000, run });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(3000);
    expect(run).toHaveBeenCalledTimes(3);
    scheduler.stop();
    await vi.advanceTimersByTimeAsync(3000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('单任务抛错不阻断其他任务', async () => {
    const scheduler = new TaskScheduler();
    const ok = vi.fn();
    scheduler.register({ id: 'bad', everyMs: 1000, run: () => { throw new Error('boom'); } });
    scheduler.register({ id: 'ok', everyMs: 1000, run: ok });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(ok).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('上一轮未完时跳过本轮（错峰不叠峰）', async () => {
    const scheduler = new TaskScheduler();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const run = vi.fn(() => gate);
    scheduler.register({ id: 'slow', everyMs: 1000, run });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(1);
    release();
    scheduler.stop();
  });

  it('runNow 立即执行一次', async () => {
    const scheduler = new TaskScheduler();
    const run = vi.fn();
    scheduler.register({ id: 't', everyMs: 60_000, run });
    await scheduler.runNow('t');
    expect(run).toHaveBeenCalledTimes(1);
  });
});
