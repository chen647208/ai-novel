/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it, vi } from 'vitest';

import { ApprovalBroker, ApprovalRouter } from '../approval.js';

const request = (over = {}) => ({
  callId: 'call_1',
  toolId: 'core.text.rewrite',
  permission: 'write:proposal' as const,
  proposal: { title: '重写开头', diff: '- 旧\n+ 新' },
  ...over,
});

describe('ApprovalBroker', () => {
  it('用户批准/拒绝决定等待中的请求', async () => {
    const broker = new ApprovalBroker();
    const seen: string[] = [];
    broker.onRequest((req) => seen.push(req.id));

    const first = broker.request(request());
    const second = broker.request(request());

    const [requestIdA] = seen;
    const [, requestIdB] = seen;
    expect(broker.decide(requestIdA!, 'approved')).toBe(true);
    expect(broker.decide(requestIdB!, 'rejected')).toBe(true);

    expect((await first).verdict).toBe('approved');
    expect((await second).verdict).toBe('rejected');
    expect(broker.pendingCount()).toBe(0);
  });

  it('超时降级：进入待审箱并返回 timeout，事后决定有效', async () => {
    vi.useFakeTimers();
    const broker = new ApprovalBroker();
    const waiting = broker.request(request({ timeoutMs: 50 }));

    const settled = vi.fn();
    void waiting.then(settled);
    await vi.advanceTimersByTimeAsync(60);

    expect(settled).toHaveBeenCalled();
    expect((await waiting).verdict).toBe('timeout');
    expect(broker.pendingCount()).toBe(1);

    const pending = broker.listPending()[0]!;
    expect(pending.reason).toBe('timeout');
    expect(pending.request.toolId).toBe('core.text.rewrite');

    // 事后批准：移出待审箱
    expect(broker.decide(pending.request.id, 'approved')).toBe(true);
    expect(broker.pendingCount()).toBe(0);
    vi.useRealTimers();
  });

  it('defer：手动搁置立即返回 timeout 判定且进待审箱', async () => {
    vi.useFakeTimers();
    const broker = new ApprovalBroker();
    const seen: string[] = [];
    broker.onRequest((req) => seen.push(req.id));
    const waiting = broker.request(request({ timeoutMs: 60_000 }));

    expect(broker.defer(seen[0]!)).toBe(true);
    expect((await waiting).verdict).toBe('timeout');
    expect((await waiting).by).toBe('deferred');
    expect(broker.pendingCount()).toBe(1);
    vi.useRealTimers();
  });

  it('决定幂等：只有第一次有效', async () => {
    const broker = new ApprovalBroker();
    const seen: string[] = [];
    broker.onRequest((req) => seen.push(req.id));
    const waiting = broker.request(request());

    expect(broker.decide(seen[0]!, 'approved')).toBe(true);
    expect(broker.decide(seen[0]!, 'rejected')).toBe(false);
    expect((await waiting).verdict).toBe('approved');
  });

  it('dispose 结束全部等待', async () => {
    const broker = new ApprovalBroker();
    const waiting = broker.request(request({ timeoutMs: 60_000 }));
    broker.dispose();
    expect((await waiting).by).toBe('disposed');
    expect(broker.pendingCount()).toBe(0);
  });
});

describe('ApprovalRouter 三档路由', () => {
  it('read 直接放行，不产生审批请求', async () => {
    const broker = new ApprovalBroker();
    const onRequest = vi.fn();
    broker.onRequest(onRequest);
    const router = new ApprovalRouter(broker);

    const result = await router.authorize('read', { callId: 'c1', toolId: 'core.index.query' });
    expect(result.allowed).toBe(true);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('write:direct 放行并触发审计回调', async () => {
    const broker = new ApprovalBroker();
    const onDirectWrite = vi.fn();
    const router = new ApprovalRouter(broker, onDirectWrite);

    const result = await router.authorize('write:direct', { callId: 'c2', toolId: 'core.summary.extract' });
    expect(result.allowed).toBe(true);
    expect(onDirectWrite).toHaveBeenCalledWith('c2', 'core.summary.extract');
  });

  it('write:proposal：approved 放行 / rejected 阻断', async () => {
    const broker = new ApprovalBroker();
    const router = new ApprovalRouter(broker);
    const seen: string[] = [];
    broker.onRequest((req) => seen.push(req.id));

    const p1 = router.authorize('write:proposal', { callId: 'c3', toolId: 'core.text.rewrite' });
    broker.decide(seen[0]!, 'approved');
    expect((await p1).allowed).toBe(true);

    const p2 = router.authorize('write:proposal', { callId: 'c4', toolId: 'core.text.rewrite' });
    broker.decide(seen[1]!, 'rejected');
    expect((await p2).allowed).toBe(false);
  });

  it('write:proposal：timeout 阻断本轮且请求进待审箱', async () => {
    vi.useFakeTimers();
    const broker = new ApprovalBroker();
    const router = new ApprovalRouter(broker);
    const waiting = router.authorize('write:proposal', { callId: 'c5', toolId: 'core.card.generate', timeoutMs: 30 });

    await vi.advanceTimersByTimeAsync(40);
    const result = await waiting;
    expect(result.allowed).toBe(false);
    expect(result.decision?.verdict).toBe('timeout');
    expect(broker.pendingCount()).toBe(1);
    vi.useRealTimers();
  });
});
