import React, { useState, useMemo } from 'react';
import { Project, Chapter, AIHistoryRecord } from '../types';

interface AIHistoryViewerProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
  onClose: () => void;
  mode?: 'modal' | 'sidebar';
}

const AIHistoryViewer: React.FC<AIHistoryViewerProps> = ({ project, onUpdate, onClose, mode = 'modal' }) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'chapter'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'model' | 'tokens'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 收集所有历史记录（从普通章节和虚拟章节）
  const allHistoryRecords = useMemo(() => {
    const records: Array<{ record: AIHistoryRecord; chapter: Chapter }> = [];
    
    // 从普通章节收集历史记录
    project.chapters.forEach(chapter => {
      if (chapter.history && chapter.history.length > 0) {
        chapter.history.forEach(record => {
          records.push({ record, chapter });
        });
      }
    });
    
    // 从虚拟章节收集历史记录
    project.virtualChapters?.forEach(chapter => {
      if (chapter.history && chapter.history.length > 0) {
        chapter.history.forEach(record => {
          records.push({ record, chapter });
        });
      }
    });
    
    return records;
  }, [project.chapters, project.virtualChapters]);

  // 过滤历史记录
  const filteredHistoryRecords = useMemo(() => {
    let filtered = allHistoryRecords;
    
    // 按章节过滤
    if (viewMode === 'chapter' && selectedChapterId) {
      filtered = filtered.filter(item => item.chapter.id === selectedChapterId);
    }
    
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.record.prompt.toLowerCase().includes(query) ||
        item.record.generatedContent.toLowerCase().includes(query) ||
        item.chapter.title.toLowerCase().includes(query) ||
        item.record.modelConfig.modelName.toLowerCase().includes(query) ||
        (item.record.metadata?.templateName?.toLowerCase() || '').includes(query)
      );
    }
    
    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = a.record.timestamp;
          bValue = b.record.timestamp;
          break;
        case 'model':
          aValue = a.record.modelConfig.modelName;
          bValue = b.record.modelConfig.modelName;
          break;
        case 'tokens':
          aValue = a.record.tokens?.total || 0;
          bValue = b.record.tokens?.total || 0;
          break;
        default:
          aValue = a.record.timestamp;
          bValue = b.record.timestamp;
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
    
    return filtered;
  }, [allHistoryRecords, viewMode, selectedChapterId, searchQuery, sortBy, sortOrder]);

  // 获取章节选项（包含普通章节和虚拟章节）
  const chapterOptions = useMemo(() => {
    const allChapters: Chapter[] = [];
    
    // 添加有历史记录的普通章节
    project.chapters.forEach(chapter => {
      if (chapter.history && chapter.history.length > 0) {
        allChapters.push(chapter);
      }
    });
    
    // 添加有历史记录的虚拟章节
    project.virtualChapters?.forEach(chapter => {
      if (chapter.history && chapter.history.length > 0) {
        allChapters.push(chapter);
      }
    });
    
    // 按order排序（虚拟章节order为-100，会显示在最前面）
    return allChapters.sort((a, b) => a.order - b.order);
  }, [project.chapters, project.virtualChapters]);

  // 检查是否为虚拟章节（order为-1）
  const isVirtualChapter = (chapter: Chapter) => {
    return chapter.order === -1;
  };

  // 获取章节显示标题
  const getChapterDisplayTitle = (chapter: Chapter) => {
    if (isVirtualChapter(chapter)) {
      return chapter.title; // 虚拟章节直接显示标题，如"灵感生成"
    }
    return `第${chapter.order + 1}章: ${chapter.title}`;
  };

  // 切换选择所有历史记录
  const toggleSelectAll = () => {
    if (selectedHistoryIds.size === filteredHistoryRecords.length) {
      setSelectedHistoryIds(new Set());
    } else {
      const allIds = new Set(filteredHistoryRecords.map(item => item.record.id));
      setSelectedHistoryIds(allIds);
    }
  };

  // 切换单个历史记录选择
  const toggleHistorySelection = (id: string) => {
    const newSet = new Set(selectedHistoryIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedHistoryIds(newSet);
  };

  // 删除选中的历史记录
  const deleteSelectedHistory = () => {
    if (selectedHistoryIds.size === 0) {
      alert('请先选择要删除的历史记录');
      return;
    }
    
    if (!window.confirm(`确定要删除选中的 ${selectedHistoryIds.size} 条历史记录吗？此操作不可撤销。`)) {
      return;
    }
    
    // 更新普通章节，移除选中的历史记录
    const updatedChapters = project.chapters.map(chapter => {
      if (!chapter.history || chapter.history.length === 0) {
        return chapter;
      }
      
      const filteredHistory = chapter.history.filter(record => !selectedHistoryIds.has(record.id));
      
      return {
        ...chapter,
        history: filteredHistory.length > 0 ? filteredHistory : undefined
      };
    });
    
    // 更新虚拟章节，移除选中的历史记录
    const updatedVirtualChapters = project.virtualChapters?.map(chapter => {
      if (!chapter.history || chapter.history.length === 0) {
        return chapter;
      }
      
      const filteredHistory = chapter.history.filter(record => !selectedHistoryIds.has(record.id));
      
      return {
        ...chapter,
        history: filteredHistory.length > 0 ? filteredHistory : undefined
      };
    }) || [];
    
    onUpdate({ 
      chapters: updatedChapters,
      virtualChapters: updatedVirtualChapters
    });
    setSelectedHistoryIds(new Set());
  };

  // 清空所有历史记录
  const clearAllHistory = () => {
    if (allHistoryRecords.length === 0) {
      alert('没有可清空的历史记录');
      return;
    }
    
    if (!window.confirm(`确定要清空所有 ${allHistoryRecords.length} 条历史记录吗？此操作不可撤销。`)) {
      return;
    }
    
    // 更新普通章节，移除所有历史记录
    const updatedChapters = project.chapters.map(chapter => ({
      ...chapter,
      history: undefined
    }));
    
    // 更新虚拟章节，移除所有历史记录
    const updatedVirtualChapters = project.virtualChapters?.map(chapter => ({
      ...chapter,
      history: undefined
    })) || [];
    
    onUpdate({ 
      chapters: updatedChapters,
      virtualChapters: updatedVirtualChapters
    });
    setSelectedHistoryIds(new Set());
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 格式化令牌数
  const formatTokens = (tokens?: { prompt: number; completion: number; total: number }) => {
    if (!tokens) return 'N/A';
    return `输入: ${tokens.prompt} | 输出: ${tokens.completion} | 总计: ${tokens.total}`;
  };

  // 获取模型提供商图标
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'fas fa-robot text-blue-500';
      case 'ollama': return 'fas fa-server text-green-500';
      case 'openai-compatible': return 'fas fa-brain text-purple-500';
      default: return 'fas fa-microchip text-gray-500';
    }
  };

  // 获取生成类型标签
  const getGenerationType = (record: AIHistoryRecord) => {
    if (record.metadata?.batchGeneration) {
      return '批量生成';
    }
    if (record.metadata?.templateName?.includes('润色') || record.metadata?.templateName?.includes('扩写')) {
      return '润色/扩写';
    }
    return '正文生成';
  };

  // 根据模式渲染不同的UI
  if (mode === 'sidebar') {
    return (
      <div className="h-full flex flex-col bg-white border-l border-gray-200 shadow-lg animate-in slide-in-from-right duration-300">
        {/* 侧边栏头部 */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">AI 历史记录</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Global History Viewer</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all"
            title="关闭历史记录侧边栏"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* 统计信息栏 - 侧边栏版本 */}
        <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">总记录</div>
              <div className="text-base font-bold text-blue-600">{allHistoryRecords.length}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">章节</div>
              <div className="text-base font-bold text-green-600">{chapterOptions.length}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">选中</div>
              <div className="text-base font-bold text-purple-600">{selectedHistoryIds.size}</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={clearAllHistory}
              className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              disabled={allHistoryRecords.length === 0}
              title="清空所有记录"
            >
              <i className="fas fa-trash-can text-xs"></i>
            </button>
            <button 
              onClick={deleteSelectedHistory}
              className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              disabled={selectedHistoryIds.size === 0}
              title="删除选中记录"
            >
              <i className="fas fa-trash text-xs"></i>
            </button>
          </div>
        </div>

        {/* 控制面板 - 侧边栏版本 */}
        <div className="p-4 border-b border-gray-100 bg-white space-y-3 shrink-0">
          {/* 视图模式选择 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">视图模式</label>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setViewMode('all');
                  setSelectedChapterId(null);
                }}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${
                  viewMode === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setViewMode('chapter')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${
                  viewMode === 'chapter' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                disabled={chapterOptions.length === 0}
              >
                章节
              </button>
            </div>
          </div>

          {/* 章节选择器 */}
          {viewMode === 'chapter' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">选择章节</label>
              <select
                value={selectedChapterId || ''}
                onChange={(e) => setSelectedChapterId(e.target.value || null)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
              >
                <option value="">选择章节...</option>
                {chapterOptions.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {getChapterDisplayTitle(chapter)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 搜索框 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">搜索</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索内容..."
                className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 pl-8 outline-none focus:ring-1 focus:ring-blue-200"
              />
              <i className="fas fa-search absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
            </div>
          </div>

          {/* 排序选项 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">排序</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'model' | 'tokens')}
                className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
              >
                <option value="timestamp">时间</option>
                <option value="model">模型</option>
                <option value="tokens">令牌</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">顺序</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${
                    sortOrder === 'desc' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  降序
                </button>
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${
                    sortOrder === 'asc' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  升序
                </button>
              </div>
            </div>
          </div>

          {/* 批量操作栏 */}
          <div className="flex justify-between items-center pt-1">
            <div className="flex items-center gap-2">
              <div 
                onClick={toggleSelectAll}
                className="flex items-center gap-1 cursor-pointer select-none"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  selectedHistoryIds.size === filteredHistoryRecords.length && filteredHistoryRecords.length > 0
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-300'
                }`}>
                  {selectedHistoryIds.size === filteredHistoryRecords.length && filteredHistoryRecords.length > 0 && (
                    <i className="fas fa-check text-[10px]"></i>
                  )}
                </div>
                <span className="text-xs font-bold text-gray-700">
                  {selectedHistoryIds.size === filteredHistoryRecords.length && filteredHistoryRecords.length > 0
                    ? '取消全选'
                    : '全选'
                  }
                </span>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              {filteredHistoryRecords.length}条
            </div>
          </div>
        </div>

        {/* 历史记录列表 */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
          {filteredHistoryRecords.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-history text-3xl text-gray-300"></i>
              </div>
              <h4 className="text-lg font-bold text-gray-400 mb-2">暂无历史记录</h4>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                {searchQuery.trim() 
                  ? '没有找到匹配的搜索内容，请尝试其他关键词。'
                  : viewMode === 'chapter' && !selectedChapterId
                    ? '请选择一个章节查看其历史记录。'
                    : 'AI生成的内容将在这里显示历史记录。'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistoryRecords.map(({ record, chapter }) => {
                const isSelected = selectedHistoryIds.has(record.id);
                const generationType = getGenerationType(record);
                
                return (
                  <div 
                    key={record.id}
                    className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-lg ${
                      isSelected ? 'border-blue-300 shadow-lg shadow-blue-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* 记录头部 */}
                    <div 
                      className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center cursor-pointer"
                      onClick={() => toggleHistorySelection(record.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'
                        }`}>
                          {isSelected && <i className="fas fa-check text-xs"></i>}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <i className={getProviderIcon(record.modelConfig.provider)}></i>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">{record.modelConfig.modelName}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">
                                {generationType}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              第{chapter.order + 1}章: {chapter.title}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-bold text-gray-700">{formatTimestamp(record.timestamp)}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {record.tokens ? `${record.tokens.total} tokens` : 'N/A tokens'}
                          </div>
                        </div>
                        <i className={`fas fa-chevron-right text-gray-300 transition-transform ${isSelected ? 'rotate-90' : ''}`}></i>
                      </div>
                    </div>
                    
                    {/* 记录详情（可展开） */}
                    {isSelected && (
                      <div className="p-6 space-y-6 animate-in fade-in duration-200">
                        {/* 模板信息 */}
                        {record.metadata?.templateName && (
                          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">使用的模板</div>
                            <div className="text-sm font-bold text-gray-800">{record.metadata.templateName}</div>
                            {record.metadata.batchGeneration && (
                              <div className="text-xs text-blue-500 mt-1">
                                <i className="fas fa-layer-group mr-1"></i> 批量生成
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* 提示词 */}
                        <div>
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">提示词</div>
                          <div className="bg-gray-50 text-gray-700 text-sm p-4 rounded-xl border border-gray-100 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                            {record.prompt}
                          </div>
                        </div>
                        
                        {/* 生成内容 */}
                        <div>
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">生成内容</div>
                          <div className="bg-emerald-50/50 text-gray-800 text-sm p-4 rounded-xl border border-emerald-100 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                            {record.generatedContent}
                          </div>
                          <div className="text-xs text-gray-400 mt-2 text-right">
                            长度: {record.generatedContent.length} 字符
                          </div>
                        </div>
                        
                        {/* 模型配置详情 */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">模型配置</div>
                            <div className="space-y-1">
                              <div className="text-sm text-gray-700">
                                <span className="font-bold">提供商:</span> {record.modelConfig.provider}
                              </div>
                              {record.modelConfig.temperature !== undefined && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-bold">温度:</span> {record.modelConfig.temperature}
                                </div>
                              )}
                              {record.modelConfig.maxTokens !== undefined && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-bold">最大令牌:</span> {record.modelConfig.maxTokens}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Token消耗详情 */}
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Token消耗</div>
                            {record.tokens ? (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">输入:</span>
                                  <span className="text-sm font-bold text-blue-600">{record.tokens.prompt}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">输出:</span>
                                  <span className="text-sm font-bold text-green-600">{record.tokens.completion}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                                  <span className="text-sm font-bold text-gray-700">总计:</span>
                                  <span className="text-sm font-bold text-purple-600">{record.tokens.total}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">无Token数据</div>
                            )}
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-center">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">操作</div>
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  // 复制生成内容到剪贴板
                                  navigator.clipboard.writeText(record.generatedContent);
                                  alert('已复制生成内容到剪贴板');
                                }}
                                className="w-full px-3 py-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-copy"></i> 复制内容
                              </button>
                              <button
                                onClick={() => {
                                  // 查看完整提示词
                                  alert(`完整提示词:\n\n${record.prompt}`);
                                }}
                                className="w-full px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-eye"></i> 查看提示词
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-500">
            共 {allHistoryRecords.length} 条历史记录，占用存储空间约 {(allHistoryRecords.reduce((total, item) => 
              total + JSON.stringify(item.record).length, 0) / 1024).toFixed(2)} KB
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 hover:text-gray-800 transition-all"
            >
              关闭
            </button>
            <button 
              onClick={deleteSelectedHistory}
              className="px-8 py-3 bg-red-600 text-white font-black text-sm rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2"
              disabled={selectedHistoryIds.size === 0}
            >
              <i className="fas fa-trash"></i> 删除选中记录 ({selectedHistoryIds.size})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 模态模式 - 全屏覆盖UI
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
        {/* 模态头部 */}
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">AI 生成历史记录</h2>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-2">Global AI History Viewer</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all shadow-lg"
            title="关闭历史记录查看器"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* 统计信息栏 */}
        <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">总记录</div>
              <div className="text-2xl font-bold text-blue-600">{allHistoryRecords.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">章节</div>
              <div className="text-2xl font-bold text-green-600">{chapterOptions.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">选中</div>
              <div className="text-2xl font-bold text-purple-600">{selectedHistoryIds.size}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">占用空间</div>
              <div className="text-lg font-bold text-gray-600">
                {(allHistoryRecords.reduce((total, item) => total + JSON.stringify(item.record).length, 0) / 1024).toFixed(2)} KB
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={clearAllHistory}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
              disabled={allHistoryRecords.length === 0}
              title="清空所有记录"
            >
              <i className="fas fa-trash-can"></i>
              清空所有
            </button>
            <button 
              onClick={deleteSelectedHistory}
              className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-200"
              disabled={selectedHistoryIds.size === 0}
              title="删除选中记录"
            >
              <i className="fas fa-trash"></i>
              删除选中 ({selectedHistoryIds.size})
            </button>
          </div>
        </div>

        {/* 控制面板 */}
        <div className="p-6 border-b border-gray-100 bg-white grid grid-cols-4 gap-6 shrink-0">
          {/* 视图模式选择 */}
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-2">视图模式</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setViewMode('all');
                  setSelectedChapterId(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                全部记录
              </button>
              <button
                onClick={() => setViewMode('chapter')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'chapter' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                disabled={chapterOptions.length === 0}
              >
                按章节
              </button>
            </div>
          </div>

          {/* 章节选择器 */}
          {viewMode === 'chapter' && (
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">选择章节</label>
              <select
                value={selectedChapterId || ''}
                onChange={(e) => setSelectedChapterId(e.target.value || null)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                <option value="">选择章节...</option>
                {chapterOptions.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {getChapterDisplayTitle(chapter)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 搜索框 */}
          <div className={viewMode === 'chapter' ? 'col-span-2' : 'col-span-3'}>
            <label className="block text-sm font-bold text-gray-500 mb-2">搜索内容</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索提示词、生成内容、章节标题或模型名称..."
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-4 py-2 pl-10 outline-none focus:ring-2 focus:ring-blue-200"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>

          {/* 排序选项 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">排序方式</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'model' | 'tokens')}
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                <option value="timestamp">生成时间</option>
                <option value="model">模型名称</option>
                <option value="tokens">Token消耗</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">排序顺序</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    sortOrder === 'desc' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  降序
                </button>
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    sortOrder === 'asc' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  升序
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 历史记录列表 */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 custom-scrollbar">
          {filteredHistoryRecords.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <i className="fas fa-history text-4xl text-gray-300"></i>
              </div>
              <h4 className="text-xl font-bold text-gray-400 mb-3">暂无历史记录</h4>
              <p className="text-gray-400 text-base max-w-lg mx-auto">
                {searchQuery.trim() 
                  ? '没有找到匹配的搜索内容，请尝试其他关键词。'
                  : viewMode === 'chapter' && !selectedChapterId
                    ? '请选择一个章节查看其历史记录。'
                    : 'AI生成的内容将在这里显示历史记录。'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredHistoryRecords.map(({ record, chapter }) => {
                const isSelected = selectedHistoryIds.has(record.id);
                const generationType = getGenerationType(record);
                
                return (
                  <div 
                    key={record.id}
                    className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-xl ${
                      isSelected ? 'border-blue-300 shadow-xl shadow-blue-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* 记录头部 */}
                    <div 
                      className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center cursor-pointer"
                      onClick={() => toggleHistorySelection(record.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'
                        }`}>
                          {isSelected && <i className="fas fa-check text-sm"></i>}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <i className={getProviderIcon(record.modelConfig.provider)}></i>
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-base font-bold text-gray-800">{record.modelConfig.modelName}</span>
                              <span className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-600 font-bold">
                                {generationType}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              第{chapter.order + 1}章: {chapter.title}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-700">{formatTimestamp(record.timestamp)}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {record.tokens ? `${record.tokens.total} tokens` : 'N/A tokens'}
                          </div>
                        </div>
                        <i className={`fas fa-chevron-right text-gray-300 transition-transform ${isSelected ? 'rotate-90' : ''}`}></i>
                      </div>
                    </div>
                    
                    {/* 记录详情（可展开） */}
                    {isSelected && (
                      <div className="p-8 space-y-8 animate-in fade-in duration-200">
                        {/* 模板信息 */}
                        {record.metadata?.templateName && (
                          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                            <div className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">使用的模板</div>
                            <div className="text-base font-bold text-gray-800">{record.metadata.templateName}</div>
                            {record.metadata.batchGeneration && (
                              <div className="text-sm text-blue-500 mt-2">
                                <i className="fas fa-layer-group mr-2"></i> 批量生成
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* 提示词 */}
                        <div>
                          <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">提示词</div>
                          <div className="bg-gray-50 text-gray-700 text-base p-6 rounded-2xl border border-gray-100 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                            {record.prompt}
                          </div>
                        </div>
                        
                        {/* 生成内容 */}
                        <div>
                          <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">生成内容</div>
                          <div className="bg-emerald-50/50 text-gray-800 text-base p-6 rounded-2xl border border-emerald-100 whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                            {record.generatedContent}
                          </div>
                          <div className="text-sm text-gray-400 mt-3 text-right">
                            长度: {record.generatedContent.length} 字符
                          </div>
                        </div>
                        
                        {/* 模型配置详情 */}
                        <div className="grid grid-cols-3 gap-6">
                          <div className="bg-gray-50 rounded-2xl p-6">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">模型配置</div>
                            <div className="space-y-2">
                              <div className="text-base text-gray-700">
                                <span className="font-bold">提供商:</span> {record.modelConfig.provider}
                              </div>
                              {record.modelConfig.temperature !== undefined && (
                                <div className="text-base text-gray-700">
                                  <span className="font-bold">温度:</span> {record.modelConfig.temperature}
                                </div>
                              )}
                              {record.modelConfig.maxTokens !== undefined && (
                                <div className="text-base text-gray-700">
                                  <span className="font-bold">最大令牌:</span> {record.modelConfig.maxTokens}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Token消耗详情 */}
                          <div className="bg-gray-50 rounded-2xl p-6">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Token消耗</div>
                            {record.tokens ? (
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-base text-gray-600">输入:</span>
                                  <span className="text-base font-bold text-blue-600">{record.tokens.prompt}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-base text-gray-600">输出:</span>
                                  <span className="text-base font-bold text-green-600">{record.tokens.completion}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                  <span className="text-base font-bold text-gray-700">总计:</span>
                                  <span className="text-base font-bold text-purple-600">{record.tokens.total}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-base text-gray-400 italic">无Token数据</div>
                            )}
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="bg-gray-50 rounded-2xl p-6 flex flex-col justify-center">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">操作</div>
                            <div className="space-y-3">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(record.generatedContent);
                                  alert('已复制生成内容到剪贴板');
                                }}
                                className="w-full px-4 py-3 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-copy"></i> 复制内容
                              </button>
                              <button
                                onClick={() => {
                                  alert(`完整提示词:\n\n${record.prompt}`);
                                }}
                                className="w-full px-4 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-eye"></i> 查看提示词
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="text-sm text-gray-500">
            共 {allHistoryRecords.length} 条历史记录，占用存储空间约 {(allHistoryRecords.reduce((total, item) => 
              total + JSON.stringify(item.record).length, 0) / 1024).toFixed(2)} KB
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-4 rounded-xl text-gray-500 font-bold text-base hover:bg-gray-200 hover:text-gray-800 transition-all"
            >
              关闭
            </button>
            <button 
              onClick={deleteSelectedHistory}
              className="px-10 py-4 bg-red-600 text-white font-black text-base rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2"
              disabled={selectedHistoryIds.size === 0}
            >
              <i className="fas fa-trash"></i> 删除选中记录 ({selectedHistoryIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHistoryViewer;
