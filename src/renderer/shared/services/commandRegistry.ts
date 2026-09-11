/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 命令注册表：命令面板的唯一来源。应用壳与功能在启动时注册内置命令，
 * 插件/后续扩展点可继续注册；注册返回解绑函数（可逆）。
 */
export interface AppCommand {
  id: string;
  title: string;
  keywords?: string;
  run: () => void;
}

type Listener = (commands: AppCommand[]) => void;

export class CommandRegistry {
  private readonly commands = new Map<string, AppCommand>();
  private readonly listeners = new Set<Listener>();

  register(command: AppCommand): () => void {
    this.commands.set(command.id, command);
    this.emit();
    return () => {
      this.commands.delete(command.id);
      this.emit();
    };
  }

  list(): AppCommand[] {
    return [...this.commands.values()];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.list();
    for (const listener of this.listeners) listener(snapshot);
  }
}

export const commandRegistry = new CommandRegistry();
