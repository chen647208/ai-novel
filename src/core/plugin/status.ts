/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * Provider 状态退避（docs/design/04 §13.1，Sonarr ProviderStatusServiceBase 对位）。
 *
 * 失败升级 `EscalationLevel` 并设 `DisabledTill`，成功后逐级回退；宿主据此跳过被禁用的 provider。
 */

/** 各升级档的禁用时长（毫秒）；索引即 EscalationLevel。 */
export const ESCALATION_BACKOFF_MS: readonly number[] = [0, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

export interface ProviderStatusState {
  escalationLevel: number;
  disabledTill: number;
  lastError?: string;
}

export class ProviderStatusService {
  private readonly states = new Map<string, ProviderStatusState>();

  recordFailure(id: string, error?: unknown, now = Date.now()): ProviderStatusState {
    const current = this.states.get(id);
    const level = Math.min((current?.escalationLevel ?? 0) + 1, ESCALATION_BACKOFF_MS.length - 1);
    const backoff = ESCALATION_BACKOFF_MS[level] ?? 0;
    const next: ProviderStatusState = {
      escalationLevel: level,
      disabledTill: now + backoff,
      lastError: error === undefined ? current?.lastError : String(error),
    };
    this.states.set(id, next);
    return next;
  }

  recordSuccess(id: string): ProviderStatusState {
    const current = this.states.get(id);
    const level = Math.max((current?.escalationLevel ?? 0) - 1, 0);
    const next: ProviderStatusState = { escalationLevel: level, disabledTill: 0 };
    this.states.set(id, next);
    return next;
  }

  isDisabled(id: string, now = Date.now()): boolean {
    const state = this.states.get(id);
    return !!state && state.disabledTill > now;
  }

  get(id: string): ProviderStatusState | undefined {
    return this.states.get(id);
  }

  reset(id: string): void {
    this.states.delete(id);
  }
}
