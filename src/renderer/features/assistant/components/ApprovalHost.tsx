/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 审批浮层宿主（docs/design/05 §5 的桌面主表面）。
 * 订阅 approvalBroker：write:proposal 请求弹出 diff 预览对话框
 * （批准/拒绝/稍后处理）；「稍后」与超时的请求进待审箱，左下角角标
 * 可打开列表逐条决定。多并发请求排队，先到先审。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/Dialog';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { X } from 'lucide-react';
import type { ApprovalRequest } from '@core/ai';
import { approvalBroker } from '../services/aiRuntime';
import { executeMcpProposal } from '../services/mcpProposalExecutor';
import { dialogService } from '@/shared/services/dialogService';

/** diff 行渲染：+ 绿 / - 红 / 其余中性。 */
const DiffPreview: React.FC<{ diff: string }> = ({ diff }) => (
  <pre className="max-h-56 overflow-auto rounded-md bg-muted/60 p-3 text-xs leading-5 whitespace-pre-wrap">
    {diff.split('\n').map((line, i) => {
      const tone = line.startsWith('+')
        ? 'text-success'
        : line.startsWith('-')
          ? 'text-destructive'
          : 'text-muted-foreground';
      return (
        <div key={i} className={tone}>
          {line || ' '}
        </div>
      );
    })}
  </pre>
);

const ApprovalHost: React.FC = () => {
  const { t } = useTranslation('assistant');
  const [queue, setQueue] = useState<ApprovalRequest[]>([]);
  const [pending, setPending] = useState<ApprovalRequest[]>([]);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [mcpBridgeError, setMcpBridgeError] = useState(false);
  // 桥接曾经通后又不通才算异常：首启无文件属正常，不报错
  const mcpBridgeOk = useRef(false);
  const current = queue[0] ?? null;

  useEffect(() => {
    const off = approvalBroker.onRequest((req) => {
      setQueue((q) => [...q, req]);
      setPending((p) => p.filter((r) => r.id !== req.id));
    });
    return off;
  }, []);

  const refreshPending = useCallback(() => {
    setPending(approvalBroker.listPending().map((p) => p.request));
  }, []);

  // 待审箱自刷新：审批解决/超时后 broker 侧状态已变但无推送事件，
  // 队列长度变化或打开待审箱时重读一次，避免列表 stale
  useEffect(() => {
    refreshPending();
  }, [queue.length, pendingOpen, refreshPending]);

  // MCP 出口桥：外部 agent 的写提案落盘于 pending-proposals.jsonl，轮询入待审箱
  useEffect(() => {
    if (!window.electronAPI) return;
    const consumed = new Set<string>(
      JSON.parse(localStorage.getItem('approval.mcp-consumed') ?? '[]') as string[],
    );
    const poll = (): void => {
      void (async () => {
        try {
          const api = window.electronAPI;
          if (!api) return;
          const base = await api.getAppDataPath();
          const file = `${base}/ai-sessions/pending-proposals.jsonl`;
          const content = await api.readFile(file);
          const seen = new Set<string>();
          for (const line of content.split('\n')) {
            if (!line.trim()) continue;
            try {
              const req = JSON.parse(line) as ApprovalRequest;
              if (req.id) seen.add(req.id);
              if (consumed.has(req.id) || !req.id || !req.proposal) continue;
              consumed.add(req.id);
              approvalBroker.addPending(req);
            } catch {
              // 单行损坏跳过
            }
          }
          // 已消费但文件里不再出现的 id 剪掉，consumed 不无限增长
          for (const id of [...consumed]) {
            if (!seen.has(id)) consumed.delete(id);
          }
          localStorage.setItem('approval.mcp-consumed', JSON.stringify([...consumed]));
          refreshPending();
          mcpBridgeOk.current = true;
          setMcpBridgeError(false);
        } catch {
          // 归档不存在或读取失败：曾经通后又不通才提示，首启无文件属正常
          setMcpBridgeError(mcpBridgeOk.current);
        }
      })();
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, [refreshPending]);

  const settle = useCallback(
    (req: ApprovalRequest, verdict: 'approved' | 'rejected') => {
      void (async () => {
        if (verdict === 'approved' && req.proposal.exec) {
          const r = await executeMcpProposal(req.proposal.exec, req.id);
          if (!r.ok) {
            dialogService.alert(t('approval.mcpFailed', { error: r.error ?? '' }));
            refreshPending();
            return;
          }
          dialogService.alert(t('approval.mcpApplied', { result: r.applied ?? '' }));
        }
        approvalBroker.decide(req.id, verdict);
        setQueue((q) => q.filter((r) => r.id !== req.id));
        refreshPending();
      })();
    },
    [refreshPending, t],
  );

  const defer = useCallback(
    (req: ApprovalRequest) => {
      approvalBroker.defer(req.id);
      setQueue((q) => q.filter((r) => r.id !== req.id));
      refreshPending();
    },
    [refreshPending],
  );

  const decidePending = useCallback(
    (req: ApprovalRequest, verdict: 'approved' | 'rejected') => {
      void (async () => {
        if (verdict === 'approved' && req.proposal.exec) {
          const r = await executeMcpProposal(req.proposal.exec, req.id);
          if (!r.ok) {
            dialogService.alert(t('approval.mcpFailed', { error: r.error ?? '' }));
            refreshPending();
            return;
          }
          dialogService.alert(t('approval.mcpApplied', { result: r.applied ?? '' }));
        }
        approvalBroker.decide(req.id, verdict);
        refreshPending();
      })();
    },
    [refreshPending, t],
  );

  const pendingCount = pending.length;
  const permLabel = useMemo(() => {
    if (!current) return '';
    if (current.permission === 'write:proposal') return t('approval.permProposal');
    if (current.permission === 'write:direct') return t('approval.permDirect');
    return t('approval.permRead');
  }, [current, t]);

  return (
    <>
      {current && (
        <Dialog open onOpenChange={(open) => { if (!open) defer(current); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{t('approval.title')}</DialogTitle>
              <DialogDescription>{t('approval.description')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{current.proposal.title}</Badge>
                <Badge variant="outline">{t('approval.toolLabel')}: {current.toolId}</Badge>
                <Badge variant="outline">{t('approval.permissionLabel')}: {permLabel}</Badge>
              </div>
              {current.proposal.summary && (
                <p className="text-muted-foreground">{current.proposal.summary}</p>
              )}
              {current.proposal.diff && (
                <div>
                  <div className="mb-1 font-medium">{t('approval.diffTitle')}</div>
                  <DiffPreview diff={current.proposal.diff} />
                </div>
              )}
              {current.proposal.suggestion && (
                <div>
                  <div className="mb-1 font-medium">{t('approval.suggestionTitle')}</div>
                  <div className="max-h-56 overflow-auto rounded-md border border-border p-3 whitespace-pre-wrap">
                    {current.proposal.suggestion}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => defer(current)}>
                {t('approval.defer')}
              </Button>
              <Button variant="destructive" onClick={() => settle(current, 'rejected')}>
                {t('approval.reject')}
              </Button>
              <Button onClick={() => settle(current, 'approved')}>{t('approval.approve')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {pendingCount > 0 && (
        <button
          type="button"
          onClick={() => { setPendingOpen((v) => !v); refreshPending(); }}
          className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-lg hover:bg-accent"
        >
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-white">
            {pendingCount}
          </span>
          {t('approval.pendingTitle')}
        </button>
      )}

      {pendingOpen && pendingCount > 0 && (
        <div className="fixed bottom-16 left-4 z-40 w-96 rounded-lg border border-border bg-card p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">{t('approval.pendingTitle')}</span>
            <Button variant="ghost" size="icon" className="size-6" onClick={() => setPendingOpen(false)} title={t('approval.closePending')}>
              <X className="size-3.5" />
            </Button>
          </div>
          {mcpBridgeError && (
            <p className="mb-2 text-xs text-warning">{t('approval.mcpBridgeError')}</p>
          )}
          <div className="max-h-72 space-y-2 overflow-auto">
            {pending.map((req) => (
              <div key={req.id} className="rounded-md border border-border p-2 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="secondary">{req.proposal.title}</Badge>
                  <span className="text-xs text-muted-foreground">{req.toolId}</span>
                </div>
                {req.proposal.summary && <p className="mb-2 text-xs text-muted-foreground">{req.proposal.summary}</p>}
                {req.proposal.diff && (
                  <div className="mb-2">
                    <DiffPreview diff={req.proposal.diff} />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => decidePending(req, 'rejected')}>
                    {t('approval.rejectPending')}
                  </Button>
                  <Button size="sm" onClick={() => decidePending(req, 'approved')}>
                    {t('approval.approvePending')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ApprovalHost;
