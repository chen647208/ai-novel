/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 周期任务调度器（docs/design/04 §12.2）：集中登记按间隔执行的任务。
 *
 * 约束：单任务抛错只记日志、不影响其余任务；上一轮未完成时跳过本轮（错峰不叠峰）；
 * `stop()` 关闭全部计时器，供应用卸载/测试清理。
 */

import { logger } from '../utils/logger';

export interface ScheduledTask {
  id: string;
  everyMs: number;
  run: () => void | Promise<void>;
}

interface Entry {
  task: ScheduledTask;
  timer: ReturnType<typeof setInterval> | null;
  running: boolean;
}

export class TaskScheduler {
  private readonly entries = new Map<string, Entry>();
  private started = false;

  /** 登记任务；返回注销函数。调度已启动时立即为此任务装配计时器。 */
  register(task: ScheduledTask): () => void {
    this.entries.set(task.id, { task, timer: null, running: false });
    if (this.started) this.arm(task.id);
    return () => this.unregister(task.id);
  }

  unregister(id: string): void {
    const entry = this.entries.get(id);
    if (entry?.timer) clearInterval(entry.timer);
    this.entries.delete(id);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const id of this.entries.keys()) this.arm(id);
  }

  stop(): void {
    this.started = false;
    for (const entry of this.entries.values()) {
      if (entry.timer) clearInterval(entry.timer);
      entry.timer = null;
    }
  }

  /** 立即执行一次（不等间隔）；与在途执行互斥。 */
  async runNow(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (entry) await this.execute(entry);
  }

  private arm(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (entry.timer) clearInterval(entry.timer);
    entry.timer = setInterval(() => {
      void this.execute(entry);
    }, entry.task.everyMs);
  }

  private async execute(entry: Entry): Promise<void> {
    if (entry.running) return;
    entry.running = true;
    try {
      await entry.task.run();
    } catch (error) {
      logger.error(`周期任务 ${entry.task.id} 失败:`, error);
    } finally {
      entry.running = false;
    }
  }
}
