/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 增强版时间线组件
 * 支持章节事件叠加显示
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from '@/i18n';
import { type Project, type TimelineEvent, type Chapter, type HistoryDate } from '../../../shared/types';
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

  // 过滤项目
  const filteredItems = useMemo(() => {
    if (filterType === 'all') return timelineItems;
    if (filterType === 'major') {
      return timelineItems.filter(item => {
        if (item.type === 'event') {
          const eventImpact = (item.data as TimelineEvent).impact;
          return eventImpact && (eventImpact.includes('重大') || eventImpact.includes('关键') || eventImpact.includes('重要'));
        }
        return true;
      });
    }
    if (filterType === 'minor') {
      return timelineItems.filter(item => {
        if (item.type === 'event') {
          const eventImpact = (item.data as TimelineEvent).impact;
          return !eventImpact || eventImpact.includes(' minor') || eventImpact.includes('次要') || eventImpact.includes('普通');
        }
        return false;
      });
    }
    return timelineItems;
  }, [timelineItems, filterType]);

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

  // 获取事件重要性样式（基于事件类型）
  const getEventImportanceStyle = (event: TimelineEvent) => {
    switch (event.type) {
      case 'battle': return 'bg-red-500 text-white';
      case 'plot': return 'bg-orange-500 text-white';
      case 'character': return 'bg-blue-500 text-white';
      case 'discovery': return 'bg-green-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

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
    <div className="bg-white rounded-[2rem] p-6 shadow-lg">
      {/* 头部 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <LayoutList className="size-4 text-purple-500" />
            {t('enhanced.title')}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {project.timeline?.config.calendarSystem || t('enhanced.calendarDefault')} |
            {' '}{t('eventsCount', { count: project.timeline?.events?.length || 0 })}
            {showChapters && `, ${t('chaptersCount', { count: project.chapters?.filter(c => c.storyDate).length || 0 })}`}
          </p>
        </div>
        <div className="flex gap-2">
          {/* 视图模式切换 */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['combined', 'events', 'chapters'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === mode 
                    ? 'bg-white text-purple-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode === 'combined' ? t('view.combined') : mode === 'events' ? t('view.events') : t('view.chapters')}
              </button>
            ))}
          </div>
          
          {/* 过滤 */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'major' | 'minor')}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white outline-none"
          >
            <option value="all">{t('filter.all')}</option>
            <option value="major">{t('filter.major')}</option>
            <option value="minor">{t('filter.minor')}</option>
          </select>
        </div>
      </div>

      {/* 时间线 */}
      <div className="relative">
        {/* 时间轴线 */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 via-purple-300 to-purple-200"></div>
        
        {/* 时间线内容 */}
        <div className="space-y-6">
          {groupedItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarX2 className="size-10 mb-3" />
              <p className="text-sm">{t('enhanced.empty')}</p>
            </div>
          ) : (
            groupedItems.map(([date, items]) => (
              <div key={date} className="relative">
                {/* 日期标记 */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-purple-200 z-10">
                    {formatDate(items[0]?.date ?? date).slice(0, 4)}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-gray-700">{formatDate(items[0]?.date ?? date)}</span>
                    <span className="text-xs text-gray-400 ml-2">({t('enhanced.itemsCount', { count: items.length })})</span>
                  </div>
                </div>
                
                {/* 该日期的所有项目 */}
                <div className="ml-20 space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.type === 'event') {
                          onEventClick?.(item.data as TimelineEvent);
                        } else {
                          onChapterClick?.(item.data as Chapter);
                        }
                      }}
                      className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                        (item.type === 'event' && selectedEventId === item.id) ||
                        (item.type === 'chapter' && selectedChapterId === item.id)
                          ? 'border-purple-300 bg-purple-50/50'
                          : item.type === 'event'
                            ? 'border-blue-100 hover:border-blue-200 bg-white'
                            : 'border-amber-100 hover:border-amber-200 bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* 类型图标 */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          item.type === 'event' 
                            ? getEventImportanceStyle(item.data as TimelineEvent)
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          {item.type === 'event' ? <Calendar className="size-4" /> : <BookOpen className="size-4" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* 标签 */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              item.type === 'event' 
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {item.type === 'event' ? t('enhanced.typeEvent') : t('enhanced.typeChapter')}
                            </span>
                            {item.type === 'event' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {getEventImportanceLabel(item.data as TimelineEvent)}
                              </span>
                            )}
                            {item.type === 'chapter' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {t('enhanced.chapterNumber', { num: (item.data as Chapter).order + 1 })}
                              </span>
                            )}
                          </div>
                          
                          {/* 标题 */}
                          <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
                          
                          {/* 描述 */}
                          {item.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                          )}
                          
                          {/* 关联信息 */}
                          {item.type === 'event' && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(item.data as TimelineEvent).relatedCharacterIds?.length && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <User className="size-4" />
                                  {t('enhanced.relatedCharacters', { count: (item.data as TimelineEvent).relatedCharacterIds?.length })}
                                </span>
                              )}
                              {(item.data as TimelineEvent).relatedLocationIds?.length && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <MapPin className="size-4" />
                                  {t('enhanced.hasLocation')}
                                </span>
                              )}
                              {(item.data as TimelineEvent).relatedChapterId && (
                                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                  <BookOpen className="size-4" />
                                  {t('enhanced.linkedChapter')}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {item.type === 'chapter' && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(item.data as Chapter).mainLocationId && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <MapPin className="size-4" />
                                  {t('enhanced.hasMainScene')}
                                </span>
                              )}
                              {(item.data as Chapter).involvedFactionIds?.length && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Users className="size-4" />
                                  {t('enhanced.relatedFactions', { count: (item.data as Chapter).involvedFactionIds?.length })}
                                </span>
                              )}
                              {(item.data as Chapter).timelineEventId && (
                                <span className="text-[10px] text-purple-600 flex items-center gap-1">
                                  <Calendar className="size-4" />
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
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-black text-red-600">
              {project.timeline?.events?.filter(e => e.type === 'battle').length || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">{t('enhanced.statBattle')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-orange-600">
              {project.timeline?.events?.filter(e => e.type === 'plot').length || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">{t('enhanced.statPlot')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-amber-600">
              {project.chapters?.filter(c => c.storyDate).length || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">{t('enhanced.statLinkedChapters')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-purple-600">
              {groupedItems.length}
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">{t('enhanced.statSpan')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTimeline;

