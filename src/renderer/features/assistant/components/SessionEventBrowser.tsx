/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 会话事件流浏览器：AI 历史（jsonl 归档）的回放视图。 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import type { AiEvent } from '@core/ai';
import { listSessionArchives, summarizeSessionUsage, type SessionArchiveEntry } from '../services/sessionArchive';

function eventLine(e: AiEvent): { label: string; tone: 'ok' | 'err' | 'muted' } {
  switch (e.t) {
    case 'session.start':
      return { label: `▶ ${e.task}`, tone: 'ok' };
    case 'turn.start':
      return { label: `— 轮次 ${e.turn} —`, tone: 'muted' };
    case 'llm.request':
      return { label: `LLM 请求（${e.model}，${e.promptChars} 字）`, tone: 'muted' };
    case 'llm.done': {
      const tokens = e.tokens as
        | { prompt?: number; completion?: number; cacheRead?: number }
        | undefined;
      const parts = [`输入 ${tokens?.prompt ?? 0}`, `输出 ${tokens?.completion ?? 0}`];
      if ((tokens?.cacheRead ?? 0) > 0) parts.push(`缓存命中 ${tokens?.cacheRead ?? 0}`);
      return { label: `LLM 完成（${parts.join(' · ')}）`, tone: 'ok' };
    }
    case 'llm.error':
      return { label: `LLM 失败：${e.error}`, tone: 'err' };
    case 'tool.call':
      return { label: `工具调用 ${e.toolId}（${JSON.stringify(e.args).slice(0, 120)}）`, tone: 'muted' };
    case 'tool.approval':
      return { label: `审批：${e.verdict}（${e.by}）`, tone: e.verdict === 'approved' ? 'ok' : 'err' };
    case 'tool.result':
      return { label: e.ok ? '工具执行成功' : `工具失败：${e.error ?? ''}`, tone: e.ok ? 'ok' : 'err' };
    case 'turn.end':
      return { label: `轮次结束（共 ${e.turns} 轮）`, tone: 'muted' };
    case 'session.end':
      return { label: e.ok ? '■ 会话完成' : `■ 会话失败：${e.error ?? ''}`, tone: e.ok ? 'ok' : 'err' };
    default:
      return { label: e.t, tone: 'muted' };
  }
}

/** 单会话用量汇总条（输入/输出/缓存命中/工具次数）。 */
const SessionUsageBar: React.FC<{ events: AiEvent[] }> = ({ events }) => {
  const { t } = useTranslation('assistant');
  const summary = React.useMemo(() => summarizeSessionUsage(events), [events]);
  if (!summary.llmCalls) return null;
  return (
    <div className="mb-2 rounded-md bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
      {t('approval.usageSummary', {
        prompt: summary.prompt,
        completion: summary.completion,
        cached: summary.cacheRead,
        tools: summary.toolCalls,
      })}
    </div>
  );
};

const SessionEventBrowser: React.FC<{ bookId: string }> = ({ bookId }) => {
  const { t } = useTranslation('assistant');
  const [sessions, setSessions] = useState<SessionArchiveEntry[] | null>(null);
  const [selected, setSelected] = useState<SessionArchiveEntry | null>(null);

  useEffect(() => {
    let alive = true;
    listSessionArchives(bookId)
      .then((entries) => {
        if (alive) setSessions(entries);
      })
      .catch(() => {
        if (alive) setSessions([]);
      });
    return () => {
      alive = false;
    };
  }, [bookId]);

  if (sessions === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!sessions.length) {
    return <div className="py-16 text-center text-sm text-muted-foreground">{t('approval.eventNoSessions')}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sessions.map((s) => (
          <Button
            key={s.sessionId}
            size="sm"
            variant={selected?.sessionId === s.sessionId ? 'default' : 'outline'}
            onClick={() => setSelected(s)}
          >
            {new Date(s.startedAt ?? 0).toLocaleString()} · {(s.task ?? '').slice(0, 18)}
          </Button>
        ))}
      </div>

      {selected && (
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={selected.ok === false ? 'destructive' : 'secondary'}>
              {selected.ok === false ? t('approval.eventFailed') : t('approval.eventDone')}
            </Badge>
            <span className="text-xs text-muted-foreground">{selected.events.length} events</span>
          </div>
          <SessionUsageBar events={selected.events} />
          <div className="max-h-80 space-y-1 overflow-auto font-mono text-xs">
            {selected.events.map((e, i) => {
              const { label, tone } = eventLine(e);
              return (
                <div
                  key={i}
                  className={
                    tone === 'ok' ? 'text-success' : tone === 'err' ? 'text-destructive' : 'text-muted-foreground'
                  }
                >
                  {new Date('at' in e ? e.at : 0).toLocaleTimeString()}  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionEventBrowser;
