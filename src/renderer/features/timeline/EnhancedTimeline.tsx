/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 增强版时间线组件
 * 支持章节事件叠加显示
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from '@/i18n';
import { type Project, type TimelineEvent, type Chapter, type HistoryDate } from '../../../shared/types';
import { Select } from '@/shared/ui/Select';
import { cn } from '@/shared/utils/cn';
import { BookOpen, Calendar, CalendarX2, LayoutList, MapPin, User, Users } from 'lucide-react';

interface EnhancedTimelineProps {
  project: Project;
  onEventClick?: (event: TimelineEvent) => void;
  onChapterClick?: (chapter: Chapter) => void;
  selectedEventId?: string;
  selectedChapterId?: string;
  showChapters?: boolean;
}

interface TimelineItem {
  id: string;
  type: 'event' | 'chapter';
  date: HistoryDate | string;
  title: string;
  description?: string;
  data: TimelineEvent | Chapter;
  orderIndex: number;
}

const EnhancedTimeline: React.FC<EnhancedTimelineProps> = ({
  project,
  onEventClick,
  onChapterClick,
  selectedEventId,
  selectedChapterId,
  showChapters = true
}) => {
  const { t } = useTranslation('timeline');
  const [viewMode, setViewMode] = useState<'combined' | 'events' | 'chapters'>('combined');
  const [filterType, setFilterType] = useState<'all' | 'major' | 'minor'>('all');

  // 构建时间线数据
  const timelineItems = useMemo((): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // 添加时间线事件
    project.timeline?.events?.forEach((event, index) => {
      items.push({
        id: event.id,
        type: 'event',
        date: event.date,
        title: event.title,
        description: event.description,
        data: event,
        orderIndex: index
      });
    });

    // 添加章节（如果启用）
    if (showChapters && project.chapters) {
      project.chapters.forEach((chapter, index) => {
        if (chapter.storyDate || chapter.timelineEventId) {
          items.push({
            id: chapter.id,
            type: 'chapter',
            date: chapter.storyDate || '',
            title: chapter.title,
            description: chapter.summary,
            data: chapter,
            orderIndex: 1000 + index // 章节排在事件后面
          });
        }
      });
    }

    // 排序
    return items.sort((a, b) => {
      // 先按日期排序
      const dateA = typeof a.date === 'string' ? a.date : JSON.stringify(a.date);
      const dateB = typeof b.date === 'string' ? b.date : JSON.stringify(b.date);

      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      // 日期相同按orderIndex排序
      return a.orderIndex - b.orderIndex;
    });
  }, [project, showChapters]);

  // 视图模式 + 重要性过滤
  const filteredItems = useMemo(() => {
    let items = timelineItems;
    if (viewMode === 'events') items = items.filter(item => item.type === 'event');
    if (viewMode === 'chapters') items = items.filter(item => item.type === 'chapter');
    if (filterType === 'major') {
      items = items.filter(item => {
        if (item.type === 'event') {
          // 重要度只读 significance 枚举（老数据入库时已归一化一次）
          return (item.data as TimelineEvent).significance === 'major';
        }
        return true;
      });
    }
    if (filterType === 'minor') {
      items = items.filter(item => {
        if (item.type === 'event') {
          return (item.data as TimelineEvent).significance !== 'major';
        }
        return false;
      });
    }
    return items;
  }, [timelineItems, viewMode, filterType]);

  // 按日期分组
  const groupedItems = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};

    filteredItems.forEach(item => {
      const dateKey = typeof item.date === 'string' ? item.date : JSON.stringify(item.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems]);

  // 获取事件重要性标签（基于事件类型）
  const getEventImportanceLabel = (event: TimelineEvent) => {
    return t(`type.${event.type ?? 'other'}`);
  };

  // 格式化日期显示
  const formatDate = (date: HistoryDate | string): string => {
    if (typeof date === 'string') return date;
    if (date.year !== undefined) {
      let result = t('date.year', { year: date.year });
      if (date.month) result += t('date.month', { month: date.month });
      if (date.day) result += t('date.day', { day: date.day });
      return result;
    }
    return JSON.stringify(date);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* 头部 */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-serif text-lg font-medium text-foreground">
            <LayoutList className="size-4 text-muted-foreground" />
            {t('enhanced.title')}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {project.timeline?.config.calendarSystem || t('enhanced.calendarDefault')} |
            {' '}{t('eventsCount', { count: project.timeline?.events?.length || 0 })}
            {showChapters && `, ${t('chaptersCount', { count: project.chapters?.filter(c => c.storyDate).length || 0 })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 视图模式切换 */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(['combined', 'events', 'chapters'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs transition-colors',
                  viewMode === mode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode === 'combined' ? t('view.combined') : mode === 'events' ? t('view.events') : t('view.chapters')}
              </button>
            ))}
          </div>

          {/* 过滤 */}
          <Select
            className="h-8 w-auto text-xs"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'major' | 'minor')}
          >
            <option value="all">{t('filter.all')}</option>
            <option value="major">{t('filter.major')}</option>
            <option value="minor">{t('filter.minor')}</option>
          </Select>
        </div>
      </div>

      {/* 时间线 */}
      <div className="relative">
        {/* 时间轴线 */}
        <div className="absolute bottom-0 left-6 top-0 w-px bg-border"></div>

        {/* 时间线内容 */}
        <div className="space-y-6">
          {groupedItems.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarX2 className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('enhanced.empty')}</p>
            </div>
          ) : (
            groupedItems.map(([date, items]) => (
              <div key={date} className="relative">
                {/* 日期标记 */}
                <div className="mb-3 flex items-center gap-4">
                  <div className="z-10 flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-medium text-muted-foreground">
                    {formatDate(items[0]?.date ?? date).slice(0, 4)}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{formatDate(items[0]?.date ?? date)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({t('enhanced.itemsCount', { count: items.length })})</span>
                  </div>
                </div>

                {/* 该日期的所有项目 */}
                <div className="ml-16 space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (item.type === 'event') {
                          onEventClick?.(item.data as TimelineEvent);
                        } else {
                          onChapterClick?.(item.data as Chapter);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (item.type === 'event') {
                            onEventClick?.(item.data as TimelineEvent);
                          } else {
                            onChapterClick?.(item.data as Chapter);
                          }
                        }
                      }}
                      className={cn(
                        'cursor-pointer rounded-lg border p-4 transition-colors',
                        (item.type === 'event' && selectedEventId === item.id) ||
                        (item.type === 'chapter' && selectedChapterId === item.id)
                          ? 'border-primary/40 bg-primary/5'
                          : item.type === 'event'
                            ? 'border-border bg-card hover:border-primary/30'
                            : 'border-border bg-muted/30 hover:border-primary/30'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* 类型图标 */}
                        <div className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg',
                          item.type === 'event' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          {item.type === 'event' ? <Calendar className="size-4" /> : <BookOpen className="size-4" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* 标签 */}
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className={cn(
                              'rounded border px-1.5 py-0.5 text-2xs',
                              item.type === 'event'
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-border bg-muted/40 text-muted-foreground'
                            )}>
                              {item.type === 'event' ? t('enhanced.typeEvent') : t('enhanced.typeChapter')}
                            </span>
                            {item.type === 'event' && (
                              <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-2xs text-muted-foreground">
                                {getEventImportanceLabel(item.data as TimelineEvent)}
                              </span>
                            )}
                            {item.type === 'chapter' && (
                              <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-2xs tabular-nums text-muted-foreground">
                                {t('enhanced.chapterNumber', { num: (item.data as Chapter).order + 1 })}
                              </span>
                            )}
                          </div>

                          {/* 标题 */}
                          <h4 className="mb-0.5 font-serif text-sm font-medium text-foreground">{item.title}</h4>

                          {/* 描述 */}
                          {item.description && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                          )}

                          {/* 关联信息 */}
                          {item.type === 'event' && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(item.data as TimelineEvent).relatedCharacterIds?.length && (
                                <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                                  <User className="size-3" />
                                  {t('enhanced.relatedCharacters', { count: (item.data as TimelineEvent).relatedCharacterIds?.length })}
                                </span>
                              )}
                              {(item.data as TimelineEvent).relatedLocationIds?.length && (
                                <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                                  <MapPin className="size-3" />
                                  {t('enhanced.hasLocation')}
                                </span>
                              )}
                              {(item.data as TimelineEvent).relatedChapterId && (
                                <span className="flex items-center gap-1 text-2xs text-primary">
                                  <BookOpen className="size-3" />
                                  {t('enhanced.linkedChapter')}
                                </span>
                              )}
                            </div>
                          )}

                          {item.type === 'chapter' && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(item.data as Chapter).mainLocationId && (
                                <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                                  <MapPin className="size-3" />
                                  {t('enhanced.hasMainScene')}
                                </span>
                              )}
                              {(item.data as Chapter).involvedFactionIds?.length && (
                                <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                                  <Users className="size-3" />
                                  {t('enhanced.relatedFactions', { count: (item.data as Chapter).involvedFactionIds?.length })}
                                </span>
                              )}
                              {(item.data as Chapter).timelineEventId && (
                                <span className="flex items-center gap-1 text-2xs text-primary">
                                  <Calendar className="size-3" />
                                  {t('enhanced.linkedEvent')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mt-5 grid grid-cols-4 gap-3 border-t border-border pt-4">
        <div className="text-center">
          <div className="font-serif text-lg font-medium tabular-nums text-foreground">
            {project.timeline?.events?.filter(e => e.type === 'battle').length || 0}
          </div>
          <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('enhanced.statBattle')}</div>
        </div>
        <div className="text-center">
          <div className="font-serif text-lg font-medium tabular-nums text-foreground">
            {project.timeline?.events?.filter(e => e.type === 'plot').length || 0}
          </div>
          <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('enhanced.statPlot')}</div>
        </div>
        <div className="text-center">
          <div className="font-serif text-lg font-medium tabular-nums text-foreground">
            {project.chapters?.filter(c => c.storyDate).length || 0}
          </div>
          <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('enhanced.statLinkedChapters')}</div>
        </div>
        <div className="text-center">
          <div className="font-serif text-lg font-medium tabular-nums text-foreground">
            {groupedItems.length}
          </div>
          <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('enhanced.statSpan')}</div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTimeline;
