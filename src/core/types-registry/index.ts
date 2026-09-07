/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

export * from './registry';
export * from './templates';

import { TypeRegistry } from './registry';
import { BUILTIN_TEMPLATES } from './templates';

/** 进程级默认注册表（内置模板）。插件注册新模板写入同一实例（带命名空间前缀）。 */
export const builtinRegistry = new TypeRegistry(BUILTIN_TEMPLATES);
