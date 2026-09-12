/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * better-sqlite3-multiple-ciphers 的类型复用声明。
 *
 * 该包是 better-sqlite3 的加密分支（同版本、同 API，额外支持 PRAGMA key/rekey），
 * 自身不带类型，这里复用 @types/better-sqlite3 的声明。
 */
/* eslint-disable @typescript-eslint/no-require-imports -- 复用 CJS 类型需 import = require 语法 */
declare module 'better-sqlite3-multiple-ciphers' {
  import Database = require('better-sqlite3');
  export = Database;
}
