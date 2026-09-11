/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';
import { BookOpen, FileText, Search } from 'lucide-react';
import { DialogTitle } from '@/shared/ui/Dialog';
import { ModalShell } from '@/shared/ui/ModalShell';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/Spinner';
import { repository } from '@/shared/services/repository';
import type { SearchHit } from '@/shared/services/repository/types';
import { useProjectStore } from '@/app/stores/projectStore';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 打开命中：bookId 必有；命中的是章节时带 chapterId。 */
  onOpenResult: (bookId: string, chapterId?: string) => void;
}

/** 全文检索最少字符（trigram 分词器下限，少于此 SQLite 后端无结果）。 */
const MIN_QUERY = 3;

/** 把 FTS 片段里的 [高亮] 标记渲染为强调，其余按纯文本转义展示。 */
function renderSnippet(snippet: string): React.ReactNode[] {
  return snippet.split(/(\[[^\]]*\])/g).filter(Boolean).map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <mark key={i} className="bg-primary/20 text-foreground">{part.slice(1, -1)}</mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** 跨书全文检索（含知识库）：FTS5 命中，点击打开对应书/章。 */
const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onOpenResult }) => {
  const { t } = useTranslation('app');
  const projects = useProjectStore((s) => s.projects);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);

  const titleByBook = useMemo(() => new Map(projects.map((p) => [p.id, p.title])), [projects]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setHits([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setHits([]);
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const result = await repository.search(q, { limit: 50 });
        if (!cancelled) setHits(result);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const q = query.trim();

  return (
    <ModalShell open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} bare contentClassName="flex max-h-[80vh] w-[92vw] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <DialogTitle className="sr-only">{t('search.title')}</DialogTitle>
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          {busy && <Spinner className="size-4 shrink-0" />}
        </div>

        <div className=" flex-1 overflow-y-auto p-4">
          {q.length < MIN_QUERY ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">{t('search.hint', { min: MIN_QUERY })}</p>
          ) : !busy && hits.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">{t('search.noResults', { query: q })}</p>
          ) : (
            <div className="space-y-2">
              {hits.map((hit) => {
                const bookTitle = titleByBook.get(hit.projectId) ?? t('search.unknownBook');
                const isChapter = hit.scope === 'chapter';
                return (
                  <button
                    key={`${hit.scope}:${hit.projectId}:${hit.id}`}
                    type="button"
                    onClick={() => { onOpenResult(hit.projectId, isChapter ? hit.id : undefined); onClose(); }}
                    className="flex w-full flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isChapter ? <FileText className="size-3.5" /> : <BookOpen className="size-3.5" />}
                      <span className="font-medium text-foreground">{bookTitle}</span>
                      <span className="text-border">·</span>
                      <span>{hit.title ?? (isChapter ? t('search.resultChapter') : t('search.resultKnowledge'))}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{renderSnippet(hit.snippet)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
    </ModalShell>
  );
};

export default GlobalSearchModal;
