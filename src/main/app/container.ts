/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { BrowserWindow } from 'electron';

/**
 * 主进程 Provider 容器（Zettlr AppServiceContainer 模式，docs/design/02）。
 *
 * 每个子系统是一个 Provider：boot 注册 IPC / 初始化资源，shutdown 释放。
 * 容器按注册序 boot、逆序 shutdown，取代 main.ts 里手写的调用顺序，
 * AI 网关与插件宿主以同样方式接入。
 */
export interface ProviderContext {
  /** 当前主窗口（可能为 null：窗口未建或已关）。对话框等 IPC 需要它作父窗口。 */
  getMainWindow(): BrowserWindow | null;
}

export interface Provider {
  readonly name: string;
  boot(ctx: ProviderContext): void | Promise<void>;
  shutdown?(ctx: ProviderContext): void | Promise<void>;
}

export class AppContainer {
  private readonly providers: Provider[] = [];

  register(provider: Provider): this {
    this.providers.push(provider);
    return this;
  }

  /** 按注册序启动；任一失败即抛出（启动失败应显式暴露，不静默） */
  async boot(ctx: ProviderContext): Promise<void> {
    for (const provider of this.providers) {
      await provider.boot(ctx);
    }
  }

  /** 逆序关闭；单个关闭失败不阻断其余（尽力释放） */
  async shutdown(ctx: ProviderContext): Promise<void> {
    for (const provider of [...this.providers].reverse()) {
      try {
        await provider.shutdown?.(ctx);
      } catch (error) {
        console.error(`[container] provider ${provider.name} shutdown failed`, error);
      }
    }
  }
}
