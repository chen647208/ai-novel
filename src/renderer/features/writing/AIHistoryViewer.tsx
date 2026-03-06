import React, { useMemo, useState } from 'react';
import AIHistoryRecordList from './components/history/AIHistoryRecordList';
import { toggleSetValue } from './utils';
import type {
  AIHistoryRecordWithChapter,
  AIHistorySortBy,
  AIHistorySortOrder,
  AIHistoryViewerProps,
  AIHistoryViewMode,
} from './types';

const AIHistoryViewer: React.FC<AIHistoryViewerProps> = ({ project, onUpdate, onClose, mode = 'modal' }) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<AIHistoryViewMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<AIHistorySortBy>('timestamp');
  const [sortOrder, setSortOrder] = useState<AIHistorySortOrder>('desc');

  const allHistoryRecords = useMemo<AIHistoryRecordWithChapter[]>(() => {
    const records: AIHistoryRecordWithChapter[] = [];

    project.chapters.forEach((chapter) => {
      if (chapter.history?.length) {
        chapter.history.forEach((record) => {
          records.push({ record, chapter });
        });
      }
    });

    project.virtualChapters?.forEach((chapter) => {
      if (chapter.history?.length) {
        chapter.history.forEach((record) => {
          records.push({ record, chapter });
        });
      }
    });

    return records;
  }, [project.chapters, project.virtualChapters]);

  const filteredHistoryRecords = useMemo(() => {
    let filtered = [...allHistoryRecords];

    if (viewMode === 'chapter' && selectedChapterId) {
      filtered = filtered.filter((item) => item.chapter.id === selectedChapterId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.record.prompt.toLowerCase().includes(query)
        || item.record.generatedContent.toLowerCase().includes(query)
        || item.chapter.title.toLowerCase().includes(query)
        || item.record.modelConfig.modelName.toLowerCase().includes(query)
        || (item.record.metadata?.templateName?.toLowerCase() || '').includes(query),
      );
    }

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'model':
          aValue = a.record.modelConfig.modelName;
          bValue = b.record.modelConfig.modelName;
          break;
        case 'tokens':
          aValue = a.record.tokens?.total || 0;
          bValue = b.record.tokens?.total || 0;
          break;
        case 'timestamp':
        default:
          aValue = a.record.timestamp;
          bValue = b.record.timestamp;
          break;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      }
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    });

    return filtered;
  }, [allHistoryRecords, viewMode, selectedChapterId, searchQuery, sortBy, sortOrder]);

  const chapterOptions = useMemo(() => {
    const allChapters = [
      ...project.chapters.filter((chapter) => chapter.history?.length),
      ...(project.virtualChapters?.filter((chapter) => chapter.history?.length) || []),
    ];

    return allChapters.sort((a, b) => a.order - b.order);
  }, [project.chapters, project.virtualChapters]);

  const totalStorageSizeKb = useMemo(
    () => (allHistoryRecords.reduce((total, item) => total + JSON.stringify(item.record).length, 0) / 1024).toFixed(2),
    [allHistoryRecords],
  );

  const getChapterDisplayTitle = (chapter: (typeof chapterOptions)[number]) => {
    if (chapter.order === -1) {
      return chapter.title;
    }
    return `第${chapter.order + 1}章: ${chapter.title}`;
  };

  const toggleSelectAll = () => {
    if (selectedHistoryIds.size === filteredHistoryRecords.length) {
      setSelectedHistoryIds(new Set());
      return;
    }

    setSelectedHistoryIds(new Set(filteredHistoryRecords.map((item) => item.record.id)));
  };

  const toggleHistorySelection = (id: string) => {
    setSelectedHistoryIds((current) => toggleSetValue(current, id));
  };

  const deleteSelectedHistory = () => {
    if (selectedHistoryIds.size === 0) {
      alert('请先选择要删除的历史记录');
      return;
    }

    if (!window.confirm(`确定要删除选中的 ${selectedHistoryIds.size} 条历史记录吗？此操作不可撤销。`)) {
      return;
    }

    const updatedChapters = project.chapters.map((chapter) => {
      if (!chapter.history?.length) {
        return chapter;
      }

      const history = chapter.history.filter((record) => !selectedHistoryIds.has(record.id));
      return { ...chapter, history: history.length > 0 ? history : undefined };
    });

    const updatedVirtualChapters = project.virtualChapters?.map((chapter) => {
      if (!chapter.history?.length) {
        return chapter;
      }

      const history = chapter.history.filter((record) => !selectedHistoryIds.has(record.id));
      return { ...chapter, history: history.length > 0 ? history : undefined };
    }) || [];

    onUpdate({ chapters: updatedChapters, virtualChapters: updatedVirtualChapters });
    setSelectedHistoryIds(new Set());
  };

  const clearAllHistory = () => {
    if (allHistoryRecords.length === 0) {
      alert('没有可清空的历史记录');
      return;
    }

    if (!window.confirm(`确定要清空所有 ${allHistoryRecords.length} 条历史记录吗？此操作不可撤销。`)) {
      return;
    }

    onUpdate({
      chapters: project.chapters.map((chapter) => ({ ...chapter, history: undefined })),
      virtualChapters: project.virtualChapters?.map((chapter) => ({ ...chapter, history: undefined })) || [],
    });
    setSelectedHistoryIds(new Set());
  };

  if (mode === 'sidebar') {
    return (
      <div className="h-full flex flex-col bg-white border-l border-gray-200 shadow-lg animate-in slide-in-from-right duration-300">
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

        <div className="p-4 border-b border-gray-100 bg-white space-y-3 shrink-0">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">视图模式</label>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setViewMode('all');
                  setSelectedChapterId(null);
                }}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                全部
              </button>
              <button
                onClick={() => setViewMode('chapter')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'chapter' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                disabled={chapterOptions.length === 0}
              >
                章节
              </button>
            </div>
          </div>

          {viewMode === 'chapter' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">选择章节</label>
              <select
                value={selectedChapterId || ''}
                onChange={(event) => setSelectedChapterId(event.target.value || null)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
              >
                <option value="">选择章节...</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {getChapterDisplayTitle(chapter)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">搜索</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索内容..."
                className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 pl-8 outline-none focus:ring-1 focus:ring-blue-200"
              />
              <i className="fas fa-search absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">排序</label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as AIHistorySortBy)}
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
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${sortOrder === 'desc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  降序
                </button>
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all ${sortOrder === 'asc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  升序
                </button>
              </div>
            </div>
          </div>
        </div>

        <AIHistoryRecordList
          variant="sidebar"
          records={filteredHistoryRecords}
          selectedHistoryIds={selectedHistoryIds}
          searchQuery={searchQuery}
          viewMode={viewMode}
          selectedChapterId={selectedChapterId}
          onToggleSelectAll={toggleSelectAll}
          onToggleHistorySelection={toggleHistorySelection}
          getChapterDisplayTitle={getChapterDisplayTitle}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
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
              <div className="text-lg font-bold text-gray-600">{totalStorageSizeKb} KB</div>
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

        <div className="p-6 border-b border-gray-100 bg-white grid grid-cols-4 gap-6 shrink-0">
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

          {viewMode === 'chapter' && (
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">选择章节</label>
              <select
                value={selectedChapterId || ''}
                onChange={(event) => setSelectedChapterId(event.target.value || null)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                <option value="">选择章节...</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {getChapterDisplayTitle(chapter)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={viewMode === 'chapter' ? 'col-span-2' : 'col-span-3'}>
            <label className="block text-sm font-bold text-gray-500 mb-2">搜索内容</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索提示词、生成内容、章节标题或模型名称..."
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-4 py-2 pl-10 outline-none focus:ring-2 focus:ring-blue-200"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">排序方式</label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as AIHistorySortBy)}
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
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${sortOrder === 'desc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  降序
                </button>
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${sortOrder === 'asc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  升序
                </button>
              </div>
            </div>
          </div>
        </div>

        <AIHistoryRecordList
          variant="modal"
          records={filteredHistoryRecords}
          selectedHistoryIds={selectedHistoryIds}
          searchQuery={searchQuery}
          viewMode={viewMode}
          selectedChapterId={selectedChapterId}
          onToggleHistorySelection={toggleHistorySelection}
          getChapterDisplayTitle={getChapterDisplayTitle}
        />

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="text-sm text-gray-500">共 {allHistoryRecords.length} 条历史记录，占用存储空间约 {totalStorageSizeKb} KB</div>
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
              <i className="fas fa-trash"></i>
              删除选中记录 ({selectedHistoryIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHistoryViewer;
