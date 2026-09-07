/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 审批管线核心（docs/design/05 §5）。
 *
 * 三档路由：read 直接放行；write:proposal 必须经 approve/reject；
 * write:direct 直接放行但调用方必须存 Revision（本引擎只记录审计事件）。
 *
 * 超时降级（harness ask-user 教训）：审批请求带超时，超时绝不静默应用，
 * 而是进「待审箱」挂起；用户事后在 UI 里决定。多表面 fan-out
 * first-answer-wins 由后续表面层（M4 辅助窗口）在 broker 之上实现。
 *
 * 纯模块：无 DOM / Electron 依赖。
 */

import type { ToolPermission } from './tools.js';

/** 审批判定。 */
export type ApprovalVerdict = 'approved' | 'rejected';

/** 待审箱条目的产生方式：显式超时挂起 / 用户手动搁置。 */
export type ApprovalPendingReason = 'timeout' | 'deferred';

/** 提案内容：文本 diff（行级）或结构化摘要，由调用方组织。 */
export interface ApprovalProposal {
  /** 展示标题（如「重写第 3 章开头」） */
  title: string;
  /** 变更摘要（给用户一句话说明） */
  summary?: string;
  /** 行级 diff 文本（unified 风格，UI 直接渲染）；纯建议类可为空 */
  diff?: string;
  /** 建议文本（「建议」档位：只给文字不落库） */
  suggestion?: string;
  /**
   * 可执行载荷（MCP/外部提案）：批准后由渲染端执行器真实落库。
   * 缺席 = 纯文本提案（批准仅关闭待审）。
   */
  exec?: McpProposalExec;
}

/** 外部提案落库动作：章节正文覆写或卡片写入（节点 id 与章节 id 同源，见 bridge 平铺集）。 */
export interface McpProposalExec {
  kind: 'chapter-write' | 'card-write';
  /** 目标书 id（缺席时执行器按章节 id 全库定位，卡片写必须提供） */
  bookId?: string;
  /** 目标章节节点 id（chapter-write 必填） */
  nodeId?: string;
  /** 卡片类型（card-write，如 character/location/faction） */
  type?: string;
  /** 展示标题 */
  title: string;
  /** 正文/卡片内容 */
  body: string;
}

export interface ApprovalRequest {
  id: string;
  /** 关联工具调用（审计链第一级：toolCallId） */
  callId: string;
  toolId: string;
  permission: ToolPermission;
  proposal: ApprovalProposal;
  createdAt: number;
  /** 超时毫秒数；超时进入待审箱并立即返回 timeout 判定 */
  timeoutMs: number;
}

export interface ApprovalDecision {
  requestId: string;
  verdict: ApprovalVerdict | 'timeout';
  /** 由谁决定：'user' | 'timeout' | 后续多表面表面 id */
  by: string;
  decidedAt: number;
}

export interface PendingApproval {
  request: ApprovalRequest;
  reason: ApprovalPendingReason;
}

export type ApprovalListener = (request: ApprovalRequest) => void;

/** broker.request 的入参：id/createdAt 自动生成，timeoutMs 缺省 5 分钟。 */
export interface ApprovalRequestInput {
  callId: string;
  toolId: string;
  permission: ToolPermission;
  proposal: ApprovalProposal;
  id?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

let seq = 0;
function nextRequestId(): string {
  seq += 1;
  return `apv_${Date.now().toString(36)}_${seq.toString(36)}`;
}

/** 审批仲裁器：一次只等一个决定；超时降级进待审箱；决定幂等（先到先得）。 */
export class ApprovalBroker {
  private readonly waiters = new Map<string, {
    request: ApprovalRequest;
    resolve: (decision: ApprovalDecision) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  private readonly pending = new Map<string, PendingApproval>();

  private listeners = new Set<ApprovalListener>();

  /** 订阅新审批请求（桌面弹窗表面即 ApprovalHost；多表面可多订阅，先答先得）。 */
  onRequest(listener: ApprovalListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 发起审批。write:direct/read 不经过这里（由 ApprovalRouter 路由）。
   * 超时后 waiter 收到 {verdict:'timeout'}，请求转入待审箱（绝不静默应用）。
   */
  request(input: ApprovalRequestInput): Promise<ApprovalDecision> {
    const request: ApprovalRequest = {
      ...input,
      id: input.id ?? nextRequestId(),
      createdAt: Date.now(),
      timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };

    return new Promise<ApprovalDecision>((resolve) => {
      const timer = setTimeout(() => {
        const waiter = this.waiters.get(request.id);
        if (!waiter) return;
        this.waiters.delete(request.id);
        this.pending.set(request.id, { request, reason: 'timeout' });
        resolve({ requestId: request.id, verdict: 'timeout', by: 'timeout', decidedAt: Date.now() });
      }, request.timeoutMs);

      this.waiters.set(request.id, { request, resolve, timer });
      for (const listener of this.listeners) {
        listener(request);
      }
    });
  }

  /** 做出决定；幂等：非待决 id 返回 false，先到先得。 */
  decide(requestId: string, verdict: ApprovalVerdict, by = 'user'): boolean {
    const waiter = this.waiters.get(requestId);
    if (waiter) {
      clearTimeout(waiter.timer);
      this.waiters.delete(requestId);
      waiter.resolve({ requestId, verdict, by, decidedAt: Date.now() });
      return true;
    }
    // 待审箱里的请求被决定：移出待审箱（decision 由 decidePending 调用方处理）
    return this.pending.delete(requestId);
  }

  /** 待审箱快照（角标/列表 UI 消费）。 */
  listPending(): PendingApproval[] {
    return [...this.pending.values()].sort((a, b) => b.request.createdAt - a.request.createdAt);
  }

  pendingCount(): number {
    return this.pending.size;
  }

  getPending(id: string): PendingApproval | undefined {
    return this.pending.get(id);
  }

  /** 外部表面（MCP stdio 等）产生的提案直接入待审箱；id 冲突时忽略旧条目。 */
  addPending(request: ApprovalRequest, reason: ApprovalPendingReason = 'deferred'): boolean {
    if (this.waiters.has(request.id) || this.pending.has(request.id)) {
      return false;
    }
    this.pending.set(request.id, { request, reason });
    return true;
  }

  /** 用户把弹出中的审批手动搁置进待审箱（不产生 timeout 判定，当前等待继续到超时）。 */
  defer(requestId: string): boolean {
    const waiter = this.waiters.get(requestId);
    if (!waiter) return false;
    // 从 waiter 转入待审箱并立即按 timeout 结束等待：语义 = 本轮不阻塞
    clearTimeout(waiter.timer);
    this.waiters.delete(requestId);
    this.pending.set(requestId, { request: waiter.request, reason: 'deferred' });
    waiter.resolve({ requestId, verdict: 'timeout', by: 'deferred', decidedAt: Date.now() });
    return true;
  }

  /** 销毁：中止全部等待（应用退出）。 */
  dispose(): void {
    for (const waiter of this.waiters.values()) {
      clearTimeout(waiter.timer);
      waiter.resolve({ requestId: waiter.request.id, verdict: 'timeout', by: 'disposed', decidedAt: Date.now() });
    }
    this.waiters.clear();
    this.pending.clear();
  }
}

/** 三档路由：把工具权限映射为审批动作。 */
export class ApprovalRouter {
  constructor(
    private readonly broker: ApprovalBroker,
    /** write:direct 生效记录（调用方存 Revision 前回调，审计链第三级入口） */
    private readonly onDirectWrite?: (callId: string, toolId: string) => void,
  ) {}

  /**
   * 按权限档位裁决是否放行：
   * - read：放行
   * - write:direct：放行 + 记录审计
   * - write:proposal：走 broker 审批（approved 放行 / rejected|timeout 阻断，
   *   timeout 时请求已在待审箱，不阻塞会话）
   */
  async authorize(permission: ToolPermission, req: { callId: string; toolId: string; proposal?: ApprovalProposal; timeoutMs?: number }): Promise<{ allowed: boolean; decision?: ApprovalDecision }> {
    if (permission === 'read') return { allowed: true };
    if (permission === 'write:direct') {
      this.onDirectWrite?.(req.callId, req.toolId);
      return { allowed: true };
    }
    const decision = await this.broker.request({
      callId: req.callId,
      toolId: req.toolId,
      permission,
      proposal: req.proposal ?? { title: req.toolId },
      timeoutMs: req.timeoutMs,
    });
    return { allowed: decision.verdict === 'approved', decision };
  }
}
