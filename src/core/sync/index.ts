/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 同步地基出口（docs/design/03 entity_changes 协议 + 08 M4）。 */
export {
  MemorySyncTransport,
  type SyncTransport,
} from './transport.js';
export {
  buildBundle,
  mergeBundle,
  localState,
  canonicalHash,
  type SyncChange,
  type SyncBundle,
  type EntitySnapshot,
  type LocalEntityState,
  type ConflictCopy,
  type MergeReport,
} from './protocol.js';
