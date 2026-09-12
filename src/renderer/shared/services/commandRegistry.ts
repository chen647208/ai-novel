/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 命令注册表：命令面板的唯一来源。应用壳与功能在启动时注册内置命令，
 * 插件/后续扩展点可继续注册；注册返回解绑函数（可逆）。
 * 存储与订阅语义复用统一贡献注册表引擎（§13）。
 */
import { ContributionRegistry } from './contributionRegistry';

export interface AppCommand {
  id: string;
  title: string;
  keywords?: string;
  run: () => void;
}

export class CommandRegistry extends ContributionRegistry<AppCommand> {
  constructor() {
    super('command');
  }
}

export const commandRegistry = new CommandRegistry();
