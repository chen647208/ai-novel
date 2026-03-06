/**
 * 增强版时间线组件
 * 支持章节事件叠加显示
 */

import React, { useState, useMemo } from 'react';
import { Project, TimelineEvent, Chapter, HistoryDate } from '../types';

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
    switch (event.type) {
      case 'battle': return '战斗';
      case 'plot': return '剧情';
      case 'character': return '角色';
      case 'discovery': return '发现';
      case 'faction': return '势力';
      case 'world': return '世界';
      default: return '其他';
    }
  };

  // 格式化日期显示
  const formatDate = (date: HistoryDate | string): string => {
    if (typeof date === 'string') return date;
    if (date.year !== undefined) {
      let result = '';
      result += `${date.year}年`;
      if (date.month) result += `${date.month}月`;
      if (date.day) result += `${date.day}日`;
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
            <i className="fas fa-stream text-purple-500"></i>
            时间线视图
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {project.timeline?.config.calendarSystem || '标准历法'} | 
            共 {project.timeline?.events?.length || 0} 个事件
            {showChapters && `, ${project.chapters?.filter(c => c.storyDate).length || 0} 个章节`}
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
                {mode === 'combined' ? '综合' : mode === 'events' ? '事件' : '章节'}
              </button>
            ))}
          </div>
          
          {/* 过滤 */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white outline-none"
          >
            <option value="all">全部</option>
            <option value="major">重要事件</option>
            <option value="minor">次要事件</option>
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
              <i className="fas fa-calendar-times text-4xl mb-3"></i>
              <p className="text-sm">暂无时间线数据</p>
            </div>
          ) : (
            groupedItems.map(([date, items]) => (
              <div key={date} className="relative">
                {/* 日期标记 */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-purple-200 z-10">
                    {formatDate(items[0].date).slice(0, 4)}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-gray-700">{formatDate(items[0].date)}</span>
                    <span className="text-xs text-gray-400 ml-2">({items.length} 项)</span>
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
                          <i className={`fas ${item.type === 'event' ? 'fa-calendar' : 'fa-book'}`}></i>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* 标签 */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              item.type === 'event' 
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {item.type === 'event' ? '事件' : '章节'}
                            </span>
                            {item.type === 'event' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {getEventImportanceLabel(item.data as TimelineEvent)}
                              </span>
                            )}
                            {item.type === 'chapter' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                第{(item.data as Chapter).order + 1}章
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
                              {(item.data as TimelineEvent).relatedCharacterIds && (item.data as TimelineEvent).relatedCharacterIds!.length > 0 && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <i className="fas fa-user"></i>
                                  {(item.data as TimelineEvent).relatedCharacterIds?.length} 角色
                                </span>
                              )}
                              {(item.data as TimelineEvent).relatedLocationIds && (item.data as TimelineEvent).relatedLocationIds!.length > 0 && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <i className="fas fa-map-marker-alt"></i>
                                  有地点
                                </span>
                              )}
                              {(item.data as TimelineEvent).relatedChapterId && (
                                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                  <i className="fas fa-book"></i>
                                  关联章节
                                </span>
                              )}
                            </div>
                          )}
                          
                          {item.type === 'chapter' && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(item.data as Chapter).mainLocationId && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <i className="fas fa-map-marker-alt"></i>
                                  有主场景
                                </span>
                              )}
                              {(item.data as Chapter).involvedFactionIds && (item.data as Chapter).involvedFactionIds!.length > 0 && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <i className="fas fa-users"></i>
                                  {(item.data as Chapter).involvedFactionIds?.length} 势力
                                </span>
                              )}
                              {(item.data as Chapter).timelineEventId && (
                                <span className="text-[10px] text-purple-600 flex items-center gap-1">
                                  <i className="fas fa-calendar"></i>
                                  关联事件
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
            <div className="text-[10px] text-gray-400 font-bold uppercase">战斗事件</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-orange-600">
              {project.timeline?.events?.filter(e => e.type === 'plot').length || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">剧情事件</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-amber-600">
              {project.chapters?.filter(c => c.storyDate).length || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">已关联章节</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-purple-600">
              {groupedItems.length}
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">时间跨度</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTimeline;
