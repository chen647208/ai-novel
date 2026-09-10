/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { OutputMode } from '../../../shared/types';
import type {
  AssistantCategory,
  AssistantEditCategory,
  SyncStatus,
} from './types';

export const DEFAULT_ASSISTANT_OUTPUT_MODE: OutputMode = 'streaming';
export const DEFAULT_ASSISTANT_CATEGORY: AssistantCategory = 'inspiration';
export const DEFAULT_ASSISTANT_EDIT_CATEGORY: AssistantEditCategory = 'inspiration';
export const DEFAULT_ASSISTANT_SYNC_STATUS: SyncStatus = 'idle';
export const DEFAULT_ASSISTANT_SUB_SELECTION_ID = 'all';

/** 语义检查串行调用间隔（毫秒）：降低上游限流概率。 */
export const AI_SEMANTIC_THROTTLE_MS = 300;
