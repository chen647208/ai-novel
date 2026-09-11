/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 应用级自定义事件名（跨扩展点解耦，避免贡献点直接依赖应用壳状态）。 */

/** 打开命令面板：命令面板触发按钮派发，应用壳监听。 */
export const COMMAND_PALETTE_EVENT = 'hongyue:command-palette.open';
