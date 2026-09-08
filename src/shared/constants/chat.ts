/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 会话记忆与压缩阈值单源（docs/design/11）。
 * 改数值只改这里；截断/压缩/摘要三处行为保持不变。
 */

/** 跟随发送的最大轮数（单轮 = 一问或一答）。 */
export const HISTORY_MAX_TURNS = 10;
/** 单轮文本上限（字符，超长截断并标注）。 */
export const HISTORY_TURN_CHARS = 800;
/** 历史总文本上限（字符，截断旧轮优先）。 */
export const HISTORY_TOTAL_CHARS = 6000;
/** 压缩触发线：历史原文超此长度则先摘要再发送。 */
export const COMPACT_THRESHOLD_CHARS = 12000;
/** 摘要本身上限（字符）。 */
export const SUMMARY_MAX_CHARS = 800;
/** 聊天附图单张上限（字节）；超限提示压缩后重发。 */
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** 聊天附图允许类型。 */
export const CHAT_IMAGE_MIMES: ReadonlyArray<string> = ['image/png', 'image/jpeg', 'image/webp'];
