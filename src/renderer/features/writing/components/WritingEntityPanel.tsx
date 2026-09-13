/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 写作实体面板：检索角色/地点/势力/知识/事件，标记本章出现，点击插入名称。 */
import type { Chapter, Project } from '@shared/types';
import { BookOpen, CalendarClock, Flag, MapPin, Search, User } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { useTranslation } from '@/i18n';
import { Input } from '@/shared/ui/Input';
import { cn } from '@/shared/utils/cn';

import { collectWritingEntities, findMentionedEntities, type WritingEntityKind } from '../services/writingEntityService';

const KIND_ICONS: Record<WritingEntityKind, React.ComponentType<{ className?: string }>> = {
  character: User,
  location: MapPin,
  faction: Flag,
  knowledge: BookOpen,
  event: CalendarClock,
};

const KIND_ORDER: WritingEntityKind[] = ['character', 'location', 'faction', 'knowledge', 'event'];

interface WritingEntityPanelProps {
  project: Project;
  activeChapter: Chapter | undefined;
  onInsertEntity: (name: string) => void;
}

const WritingEntityPanel: React.FC<WritingEntityPanelProps> = ({ project, activeChapter, onInsertEntity }) => {
  const { t } = useTranslation('writing');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<WritingEntityKind | 'all'>('all');

  const entities = useMemo(() => collectWritingEntities(project), [project]);
  const mentioned = useMemo(() => findMentionedEntities(activeChapter?.content ?? '', entities), [activeChapter?.content, entities]);
  const keyword = query.trim().toLowerCase();
  const filtered = entities.filter((entity) => (kind === 'all' || entity.kind === kind) && (!keyword || entity.name.toLowerCase().includes(keyword)));

  const kindLabels: Record<WritingEntityKind | 'all', string> = {
    all: t('entities.kind.all'),
    character: t('entities.kind.character'),
    location: t('entities.kind.location'),
    faction: t('entities.kind.faction'),
    knowledge: t('entities.kind.knowledge'),
    event: t('entities.kind.event'),
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('entities.title')}</h4>
        <span className="text-2xs text-muted-foreground">{t('entities.count', { count: entities.length })}</span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('entities.searchPlaceholder')} className="h-8 pl-7 text-xs" />
      </div>

      <div className="flex flex-wrap gap-1">
        {(['all', ...KIND_ORDER] as Array<WritingEntityKind | 'all'>).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-2xs transition-colors',
              kind === value ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent/40',
            )}
          >
            {kindLabels[value]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">{t('entities.empty')}</p>
      ) : (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto">
          {filtered.map((entity) => {
            const Icon = KIND_ICONS[entity.kind];
            const isMentioned = mentioned.has(entity.id);
            return (
              <li key={`${entity.kind}:${entity.id}`}>
                <button
                  type="button"
                  title={t('entities.insertHint')}
                  onClick={() => onInsertEntity(entity.name)}
                  className="w-full rounded-lg border border-border bg-muted/30 p-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-serif font-medium">{entity.name}</span>
                    {isMentioned && <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-2xs text-primary">{t('entities.mentioned')}</span>}
                  </div>
                  {entity.description && <div className="mt-1 line-clamp-2 pl-5 text-xs leading-relaxed text-muted-foreground">{entity.description}</div>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default WritingEntityPanel;
