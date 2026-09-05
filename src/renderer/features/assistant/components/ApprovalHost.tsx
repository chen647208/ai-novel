/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { ApprovalRequest } from '@core/ai';
import { approvalBroker } from '../services/aiRuntime';

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

  const settle = useCallback(
    (req: ApprovalRequest, verdict: 'approved' | 'rejected') => {
      approvalBroker.decide(req.id, verdict);
      setQueue((q) => q.filter((r) => r.id !== req.id));
      refreshPending();
    },
    [refreshPending],
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
      approvalBroker.decide(req.id, verdict);
      refreshPending();
    },
    [refreshPending],
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

      {pendingCount > 0 && !current && (
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
          <div className="mb-2 font-medium">{t('approval.pendingTitle')}</div>
          <div className="max-h-72 space-y-2 overflow-auto">
            {pending.map((req) => (
              <div key={req.id} className="rounded-md border border-border p-2 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="secondary">{req.proposal.title}</Badge>
                  <span className="text-xs text-muted-foreground">{req.toolId}</span>
                </div>
                {req.proposal.summary && <p className="mb-2 text-xs text-muted-foreground">{req.proposal.summary}</p>}
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
