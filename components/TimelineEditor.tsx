import React, { useState, useEffect, useMemo } from 'react';
import { Timeline, TimelineEvent, HistoryDate, Character, Location, Faction, Chapter } from '../types';

interface TimelineEditorProps {
  projectId: string;
  timeline?: Timeline;
  characters: Character[];
  locations: Location[];
  factions: Faction[];
  chapters: Chapter[];
  onSave: (timeline: Timeline) => void;
}

/**
 * 时间线编辑器组件
 * 
 * 功能：
 * - 创建/编辑时间线事件
 * - 按时间顺序排列事件
 * - 关联角色、地点、势力、章节
 * - 事件类型分类（剧情、角色、世界、势力等）
 * - 可视化时间线展示
 */
export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  projectId,
  timeline,
  characters,
  locations,
  factions,
  chapters,
  onSave
}) => {
  const [localTimeline, setLocalTimeline] = useState<Partial<Timeline>>({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [filterType, setFilterType] = useState<TimelineEvent['type'] | 'all'>('all');

  // 初始化本地状态
  useEffect(() => {
    if (timeline) {
      setLocalTimeline(timeline);
    } else {
      setLocalTimeline({
        id: `timeline_${Date.now()}`,
        projectId,
        config: {
          calendarSystem: '公元',
          name: '主时间线'
        },
        events: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  }, [timeline, projectId]);

  // 获取选中的事件
  const selectedEvent = localTimeline.events?.find(e => e.id === selectedEventId);

  // 排序后的事件列表
  const sortedEvents = useMemo(() => {
    const events = localTimeline.events || [];
    return [...events].sort((a, b) => {
      // 先按年排序
      const yearDiff = (a.date.year || 0) - (b.date.year || 0);
      if (yearDiff !== 0) return yearDiff;
      // 再按月排序
      const monthDiff = (a.date.month || 0) - (b.date.month || 0);
      if (monthDiff !== 0) return monthDiff;
      // 最后按日排序
      return (a.date.day || 0) - (b.date.day || 0);
    });
  }, [localTimeline.events]);

  // 过滤后的事件
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return sortedEvents;
    return sortedEvents.filter(e => e.type === filterType);
  }, [sortedEvents, filterType]);

  // 更新时间线配置
  const updateConfig = (updates: Partial<Timeline['config']>) => {
    setLocalTimeline(prev => ({
      ...prev,
      config: { ...prev.config, ...updates } as Timeline['config']
    }));
    setHasChanges(true);
  };

  // 添加新事件
  const addEvent = () => {
    const newEvent: TimelineEvent = {
      id: `event_${Date.now()}`,
      date: { year: 0 },
      title: '新事件',
      description: '',
      type: 'plot'
    };
    setLocalTimeline(prev => ({
      ...prev,
      events: [...(prev.events || []), newEvent]
    }));
    setSelectedEventId(newEvent.id);
    setHasChanges(true);
  };

  // 更新事件
  const updateEvent = (id: string, updates: Partial<TimelineEvent>) => {
    setLocalTimeline(prev => ({
      ...prev,
      events: prev.events?.map(e => 
        e.id === id ? { ...e, ...updates } : e
      )
    }));
    setHasChanges(true);
  };

  // 删除事件
  const deleteEvent = (id: string) => {
    if (window.confirm('确定要删除这个时间线事件吗？')) {
      setLocalTimeline(prev => ({
        ...prev,
        events: prev.events?.filter(e => e.id !== id)
      }));
      if (selectedEventId === id) {
        setSelectedEventId(null);
      }
      setHasChanges(true);
    }
  };

  // 保存所有更改
  const handleSave = () => {
    const toSave: Timeline = {
      id: localTimeline.id || `timeline_${Date.now()}`,
      projectId,
      config: localTimeline.config || { calendarSystem: '公元' },
      events: localTimeline.events || [],
      createdAt: localTimeline.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    onSave(toSave);
    setHasChanges(false);
  };

  // 获取事件类型显示名称
  const getEventTypeLabel = (type: TimelineEvent['type']) => {
    const labels: Record<TimelineEvent['type'], string> = {
      plot: '剧情',
      character: '角色',
      world: '世界',
      faction: '势力',
      battle: '战斗',
      discovery: '发现',
      other: '其他'
    };
    return labels[type] || type;
  };

  // 获取事件类型颜色
  const getEventTypeColor = (type: TimelineEvent['type']) => {
    const colors: Record<TimelineEvent['type'], string> = {
      plot: 'bg-blue-100 text-blue-700',
      character: 'bg-green-100 text-green-700',
      world: 'bg-purple-100 text-purple-700',
      faction: 'bg-amber-100 text-amber-700',
      battle: 'bg-red-100 text-red-700',
      discovery: 'bg-cyan-100 text-cyan-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // 格式化日期显示
  const formatDate = (date: HistoryDate) => {
    if (date.display) return date.display;
    const parts = [];
    if (date.year !== undefined) parts.push(`${date.year}年`);
    if (date.month) parts.push(`${date.month}月`);
    if (date.day) parts.push(`${date.day}日`);
    return parts.join('') || '未设置日期';
  };

  return (
    <div className="space-y-4">
      {/* 时间线配置 */}
      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
        <h4 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
          <i className="fas fa-cog"></i>
          时间线配置
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">时间线名称</label>
            <input
              type="text"
              value={localTimeline.config?.name || ''}
              onChange={(e) => updateConfig({ name: e.target.value })}
              placeholder="如：主时间线、角色成长线"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">历法系统</label>
            <input
              type="text"
              value={localTimeline.config?.calendarSystem || ''}
              onChange={(e) => updateConfig({ calendarSystem: e.target.value })}
              placeholder="如：公元、纪元、XX历"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-600">筛选：</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="all">全部类型</option>
            <option value="plot">剧情</option>
            <option value="character">角色</option>
            <option value="world">世界</option>
            <option value="faction">势力</option>
            <option value="battle">战斗</option>
            <option value="discovery">发现</option>
            <option value="other">其他</option>
          </select>
        </div>
        <button
          onClick={addEvent}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          添加事件
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* 事件列表 */}
        <div className="col-span-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-100 flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-700">
              事件列表 ({filteredEvents.length})
            </h4>
            <span className="text-xs text-gray-500">
              共 {localTimeline.events?.length || 0} 个事件
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                {filterType !== 'all' ? '该类型暂无事件' : '暂无事件，点击添加'}
              </div>
            ) : (
              <div className="relative">
                {/* 时间线轴线 */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-indigo-200"></div>
                
                {filteredEvents.map((event, index) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className={`relative p-3 cursor-pointer transition-colors ${
                      selectedEventId === event.id
                        ? 'bg-indigo-50'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {/* 时间点标记 */}
                    <div className={`absolute left-3 top-4 w-3 h-3 rounded-full border-2 ${
                      selectedEventId === event.id
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'bg-white border-indigo-300'
                    }`}></div>
                    
                    <div className="ml-8">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getEventTypeColor(event.type)}`}>
                          {getEventTypeLabel(event.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(event.date)}
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-gray-800 mt-1">
                        {event.title}
                      </h5>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {event.description || '暂无描述'}
                      </p>
                      
                      {/* 关联信息 */}
                      {((event.relatedCharacterIds?.length ?? 0) > 0 || (event.relatedLocationIds?.length ?? 0) > 0 || (event.relatedFactionIds?.length ?? 0) > 0) && (
                        <div className="flex gap-2 mt-1 text-xs text-gray-400">
                          {(event.relatedCharacterIds?.length ?? 0) > 0 && (
                            <span><i className="fas fa-user mr-1"></i>{event.relatedCharacterIds?.length ?? 0}</span>
                          )}
                          {(event.relatedLocationIds?.length ?? 0) > 0 && (
                            <span><i className="fas fa-map-marker-alt mr-1"></i>{event.relatedLocationIds?.length ?? 0}</span>
                          )}
                          {(event.relatedFactionIds?.length ?? 0) > 0 && (
                            <span><i className="fas fa-flag mr-1"></i>{event.relatedFactionIds?.length ?? 0}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 事件详情编辑 */}
        <div className="col-span-3">
          {selectedEvent ? (
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4 animate-in fade-in max-h-[500px] overflow-y-auto">
              {/* 头部 */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 className="font-bold text-gray-800">事件详情</h4>
                <button
                  onClick={() => deleteEvent(selectedEvent.id)}
                  className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                >
                  <i className="fas fa-trash"></i>
                  删除
                </button>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">事件标题</label>
                  <input
                    type="text"
                    value={selectedEvent.title}
                    onChange={(e) => updateEvent(selectedEvent.id, { title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">事件类型</label>
                  <select
                    value={selectedEvent.type}
                    onChange={(e) => updateEvent(selectedEvent.id, { type: e.target.value as TimelineEvent['type'] })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                  >
                    <option value="plot">剧情</option>
                    <option value="character">角色</option>
                    <option value="world">世界</option>
                    <option value="faction">势力</option>
                    <option value="battle">战斗</option>
                    <option value="discovery">发现</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>

              {/* 日期 */}
              <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                <h5 className="text-xs font-bold text-indigo-800 mb-2">事件日期</h5>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">年</label>
                    <input
                      type="number"
                      value={selectedEvent.date.year || 0}
                      onChange={(e) => updateEvent(selectedEvent.id, {
                        date: { ...selectedEvent.date, year: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">月（可选）</label>
                    <input
                      type="number"
                      value={selectedEvent.date.month || ''}
                      onChange={(e) => updateEvent(selectedEvent.id, {
                        date: { ...selectedEvent.date, month: e.target.value ? parseInt(e.target.value) : undefined }
                      })}
                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">日（可选）</label>
                    <input
                      type="number"
                      value={selectedEvent.date.day || ''}
                      onChange={(e) => updateEvent(selectedEvent.id, {
                        date: { ...selectedEvent.date, day: e.target.value ? parseInt(e.target.value) : undefined }
                      })}
                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">显示文本</label>
                    <input
                      type="text"
                      value={selectedEvent.date.display || ''}
                      onChange={(e) => updateEvent(selectedEvent.id, {
                        date: { ...selectedEvent.date, display: e.target.value }
                      })}
                      placeholder="如：第三纪元春季"
                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">事件描述</label>
                <textarea
                  value={selectedEvent.description}
                  onChange={(e) => updateEvent(selectedEvent.id, { description: e.target.value })}
                  placeholder="描述这个事件的详细情况..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                />
              </div>

              {/* 影响 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">事件影响</label>
                <textarea
                  value={selectedEvent.impact || ''}
                  onChange={(e) => updateEvent(selectedEvent.id, { impact: e.target.value })}
                  placeholder="描述这个事件对故事的影响..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none resize-none bg-indigo-50/30"
                />
              </div>

              {/* 关联章节 */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">关联章节</label>
                <select
                  value={selectedEvent.relatedChapterId || ''}
                  onChange={(e) => updateEvent(selectedEvent.id, { relatedChapterId: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                >
                  <option value="">无关联</option>
                  {chapters.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>
                      第{chapter.order + 1}章：{chapter.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 关联角色 */}
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-bold text-gray-600 mb-2">关联角色</label>
                {characters.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">暂无角色</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                    {characters.map(character => (
                      <label
                        key={character.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedEvent.relatedCharacterIds?.includes(character.id)
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvent.relatedCharacterIds?.includes(character.id) || false}
                          onChange={() => {
                            const currentIds = selectedEvent.relatedCharacterIds || [];
                            const newIds = currentIds.includes(character.id)
                              ? currentIds.filter(id => id !== character.id)
                              : [...currentIds, character.id];
                            updateEvent(selectedEvent.id, { relatedCharacterIds: newIds });
                          }}
                          className="rounded text-green-600 focus:ring-green-500"
                        />
                        <span className="text-xs truncate">{character.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 关联地点 */}
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-bold text-gray-600 mb-2">关联地点</label>
                {locations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">暂无地点</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                    {locations.map(location => (
                      <label
                        key={location.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedEvent.relatedLocationIds?.includes(location.id)
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvent.relatedLocationIds?.includes(location.id) || false}
                          onChange={() => {
                            const currentIds = selectedEvent.relatedLocationIds || [];
                            const newIds = currentIds.includes(location.id)
                              ? currentIds.filter(id => id !== location.id)
                              : [...currentIds, location.id];
                            updateEvent(selectedEvent.id, { relatedLocationIds: newIds });
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs truncate">{location.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 关联势力 */}
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-bold text-gray-600 mb-2">关联势力</label>
                {factions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">暂无势力</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                    {factions.map(faction => (
                      <label
                        key={faction.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedEvent.relatedFactionIds?.includes(faction.id)
                            ? 'bg-amber-50 border border-amber-200'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvent.relatedFactionIds?.includes(faction.id) || false}
                          onChange={() => {
                            const currentIds = selectedEvent.relatedFactionIds || [];
                            const newIds = currentIds.includes(faction.id)
                              ? currentIds.filter(id => id !== faction.id)
                              : [...currentIds, faction.id];
                            updateEvent(selectedEvent.id, { relatedFactionIds: newIds });
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs truncate">{faction.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <i className="fas fa-clock text-4xl mb-2 opacity-30"></i>
                <p className="text-sm">选择左侧事件进行编辑</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 保存按钮 */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-gray-100 animate-in fade-in">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-save"></i>
            保存时间线
          </button>
        </div>
      )}
    </div>
  );
};

export default TimelineEditor;
