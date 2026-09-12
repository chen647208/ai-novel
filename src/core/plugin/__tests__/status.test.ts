/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it } from 'vitest';

import { ESCALATION_BACKOFF_MS, ProviderStatusService } from '../status';

describe('ProviderStatusService（§13.1 状态退避）', () => {
  it('失败升级并设置 DisabledTill，随后逐级回退', () => {
    const service = new ProviderStatusService();
    const now = 1_000_000;
    expect(service.isDisabled('p', now)).toBe(false);

    const first = service.recordFailure('p', 'boom', now);
    expect(first.escalationLevel).toBe(1);
    expect(first.disabledTill).toBe(now + ESCALATION_BACKOFF_MS[1]!);
    expect(service.isDisabled('p', now)).toBe(true);
    // 退避期内仍禁用，过期后恢复
    expect(service.isDisabled('p', first.disabledTill + 1)).toBe(false);

    const second = service.recordFailure('p', 'boom', now);
    expect(second.escalationLevel).toBe(2);
    expect(second.disabledTill).toBe(now + ESCALATION_BACKOFF_MS[2]!);
  });

  it('升级档封顶', () => {
    const service = new ProviderStatusService();
    for (let i = 0; i < 10; i += 1) service.recordFailure('p');
    expect(service.get('p')?.escalationLevel).toBe(ESCALATION_BACKOFF_MS.length - 1);
  });

  it('成功逐级回退到 0 并清除禁用', () => {
    const service = new ProviderStatusService();
    service.recordFailure('p');
    service.recordFailure('p');
    expect(service.recordSuccess('p').escalationLevel).toBe(1);
    expect(service.recordSuccess('p').escalationLevel).toBe(0);
    expect(service.recordSuccess('p').escalationLevel).toBe(0);
    expect(service.isDisabled('p')).toBe(false);
  });
});
