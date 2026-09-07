/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/* eslint-disable no-console -- 本文件是渲染层日志出口单点，唯一允许直接调用 console 的位置 */

/**
 * 渲染层统一日志入口。
 *
 * - debug / info：仅开发构建输出（import.meta.env.DEV 为编译期常量，
 *   生产构建中整个分支被 Vite/Rollup 树摇移除，不残留调试日志）。
 * - warn / error：始终输出，用于错误上报与异常现场。
 *
 * 除本文件外，渲染层代码一律使用 logger 而不得直接调用 console。
 */
const isDev = import.meta.env.DEV;

export const logger = {
  debug(...args: unknown[]): void {
    if (isDev) console.debug(...args);
  },
  info(...args: unknown[]): void {
    if (isDev) console.info(...args);
  },
  warn(...args: unknown[]): void {
    console.warn(...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
  },
};
