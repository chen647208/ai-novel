import React, { useState, useEffect, useRef } from 'react';
import { Project, KnowledgeItem, KnowledgeCategory, SearchResult, HybridSearchResult, Location, Faction, DiagramType, ModelConfig, EmbeddingModelConfig } from '../types';
import { vectorIntegrationService } from '../services/vectorIntegrationService';
import { storage } from '../services/storage';
import { embeddingModelService } from '../services/embeddingModelService';
import LocationEditor from './LocationEditor';
import FactionEditor from './FactionEditor';
import TimelineEditor from './TimelineEditor';
import RuleSystemEditor from './RuleSystemEditor';
import WorldViewGraph from './WorldViewGraph';
import ConsistencyChecker from './ConsistencyChecker';
import SmartRecommender from './SmartRecommender';
import EnhancedTimeline from './EnhancedTimeline';

interface StepKnowledgeEnhancedProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
  activeModel?: ModelConfig | null;
}

const StepKnowledgeEnhanced: React.FC<StepKnowledgeEnhancedProps> = ({ project, onUpdate, activeModel: propActiveModel }) => {
  const [dragActive, setDragActive] = useState(false);
  const [viewingItem, setViewingItem] = useState<KnowledgeItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');

  // 编辑状态
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<KnowledgeCategory>('writing');
  const [isDirty, setIsDirty] = useState(false);

  // 向量搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HybridSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic' | 'hybrid'>('hybrid');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [vectorStats, setVectorStats] = useState<{ count: number; dimensions: number; categories: Record<string, number> } | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);

  // Phase 2: 地点与势力编辑器显示状态
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [showFactionEditor, setShowFactionEditor] = useState(false);
  
  // Phase 3: 时间线编辑器显示状态
  const [showTimelineEditor, setShowTimelineEditor] = useState(false);
  
  // Phase 4: 规则系统编辑器显示状态
  const [showRuleSystemEditor, setShowRuleSystemEditor] = useState(false);
  
  // Phase 5: 世界观图谱显示状态
  const [showWorldViewGraph, setShowWorldViewGraph] = useState(false);
  const [graphInitialType, setGraphInitialType] = useState<DiagramType>('mixed');
  
  // Phase 6: 一致性检查与智能推荐
  const [showConsistencyChecker, setShowConsistencyChecker] = useState(false);
  const [showSmartRecommender, setShowSmartRecommender] = useState(false);
  const [showEnhancedTimeline, setShowEnhancedTimeline] = useState(false);
  const [consistencyPrompts, setConsistencyPrompts] = useState<import('../types').ConsistencyCheckPromptTemplate[]>([]);
  const [consistencyConfig, setConsistencyConfig] = useState<import('../types').ConsistencyCheckConfig | null>(null);
  
  // 模型配置（从props或服务商获取）
  const [activeModel, setActiveModel] = useState<ModelConfig | null>(propActiveModel || null);
  const [activeEmbeddingConfig, setActiveEmbeddingConfig] = useState<EmbeddingModelConfig | null>(null);

  // 当 props 中的 activeModel 变化时更新状态
  useEffect(() => {
    if (propActiveModel) {
      setActiveModel(propActiveModel);
    }
  }, [propActiveModel]);

  // 加载一致性检查配置和 Embedding 模型配置
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        // 从 storage 加载一致性检查配置
        const prompts = await storage.loadConsistencyPrompts();
        const config = await storage.loadConsistencyCheckConfig();
        
        if (prompts) setConsistencyPrompts(prompts);
        if (config) setConsistencyConfig(config);
        
        // 从 Embedding 服务获取激活的 Embedding 模型配置
        const embeddingConfig = await embeddingModelService.getActiveConfig();
        if (embeddingConfig) {
          setActiveEmbeddingConfig(embeddingConfig);
        }
      } catch (error) {
        console.error('Failed to load configs:', error);
      }
    };
    
    loadConfigs();
  }, []);

  // 防抖引用
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 当切换查看的条目时，重置编辑内容
  useEffect(() => {
    if (viewingItem) {
      setEditContent(viewingItem.content);
      setEditName(viewingItem.name);
      setEditCategory(viewingItem.category);
      setIsDirty(false);
    }
  }, [viewingItem]);

  // 初始化时获取向量统计信息
  useEffect(() => {
    const loadVectorStats = async () => {
      try {
        const stats = await vectorIntegrationService.getVectorStats(project.id);
        setVectorStats(stats);
      } catch (error) {
        console.error('Failed to load vector stats:', error);
      }
    };

    if (project.id) {
      loadVectorStats();
    }
  }, [project.id]);

  // 获取分类显示名称
  const getCategoryDisplayName = (category: KnowledgeCategory | 'all'): string => {
    const categoryNames: Record<KnowledgeCategory | 'all', string> = {
      'all': '全部',
      'inspiration': '灵感生成',
      'character': '世界与角色',
      'outline': '小说大纲',
      'chapter': '章节细纲',
      'writing': '正文'
    };
    return categoryNames[category];
  };

  // 获取过滤后的知识库列表
  const getFilteredKnowledge = (): KnowledgeItem[] => {
    const knowledge = project.knowledge || [];
    if (selectedCategory === 'all') {
      return knowledge;
    }
    return knowledge.filter(item => item.category === selectedCategory);
  };

  // 处理文件上传
  const handleFiles = async (files: FileList) => {
    const newItems: KnowledgeItem[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        try {
          const text = await file.text();
          const uniqueId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9) + '_' + i;
          newItems.push({
            id: uniqueId,
            name: file.name,
            content: text,
            type: file.name.split('.').pop() || 'txt',
            size: file.size,
            addedAt: Date.now(),
            category: selectedCategory === 'all' ? 'writing' : selectedCategory
          });
        } catch (err) {
          console.error("Failed to read file", file.name, err);
          alert(`读取文件 ${file.name} 失败`);
        }
      } else {
        alert(`文件 ${file.name} 格式不支持。目前仅支持 txt, md, json 等纯文本格式。请将 Word 文档另存为 txt 后上传。`);
      }
    }

    if (newItems.length > 0) {
      const updatedKnowledge = [...(project.knowledge || []), ...newItems];
      onUpdate({ knowledge: updatedKnowledge });

      // 自动向量化新上传的文件
      await indexKnowledgeItems(newItems);
    }
  };

  // 索引知识库项目
  const indexKnowledgeItems = async (items: KnowledgeItem[]) => {
    if (items.length === 0) return;

    setIsIndexing(true);
    setIndexProgress(0);

    try {
      console.log(`开始索引 ${items.length} 个知识库项目...`);
      const result = await vectorIntegrationService.indexKnowledgeBase(project.id, items);
      
      console.log('索引结果:', result);
      
      if (result.success) {
        // 更新统计信息
        const stats = await vectorIntegrationService.getVectorStats(project.id);
        console.log('更新后的统计信息:', stats);
        setVectorStats(stats);
        
        console.log(`✅ 成功索引 ${result.indexedCount} 个文档`);
      } else {
        console.error('❌ 索引失败:', result.error);
        alert(`索引失败: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ 索引过程中出错:', error);
      alert(`索引出错: ${error}`);
    } finally {
      setIsIndexing(false);
      setIndexProgress(100);
    }
  };

  // 语义搜索
  const handleSemanticSearch = async (query: string) => {
    if (!query.trim() || !project.id) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      let results: HybridSearchResult[] = [];
      
      switch (searchMode) {
        case 'semantic':
          const semanticResults = await vectorIntegrationService.semanticSearchKnowledge(project.id, query, {
            limit: 10,
            threshold: 0.3
          });
          // 将SearchResult转换为HybridSearchResult
          results = semanticResults.map(result => ({
            ...result,
            semanticScore: result.score,
            keywordScore: 0,
            combinedScore: result.score
          }));
          break;
        case 'hybrid':
          results = await vectorIntegrationService.hybridSearchKnowledge(project.id, query, {
            limit: 10,
            threshold: 0.3,
            semanticWeight: 0.7,
            keywordWeight: 0.3
          });
          break;
        case 'keyword':
          // 关键词搜索使用现有的知识库过滤
          const filtered = getFilteredKnowledge().filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase()) || 
            item.content.toLowerCase().includes(query.toLowerCase())
          );
          results = filtered.map(item => ({
            document: {
              id: item.id,
              projectId: project.id,
              knowledgeItemId: item.id,
              content: item.content.substring(0, 200),
              embedding: [],
              metadata: {
                category: item.category,
                type: item.type,
                size: item.size,
                addedAt: item.addedAt,
                name: item.name // 添加name属性
              }
            },
            score: 1.0,
            content: item.content.substring(0, 200),
            metadata: {
              category: item.category,
              type: item.type,
              size: item.size,
              addedAt: item.addedAt,
              name: item.name // 添加name属性
            },
            semanticScore: 0,
            keywordScore: 1.0,
            combinedScore: 1.0
          }));
          break;
      }

      setSearchResults(results);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 防抖搜索
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSemanticSearch(query);
      }, 500);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // 处理删除
  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      // 确认删除
      const newList = (project.knowledge || []).filter(k => k.id !== id);
      onUpdate({ knowledge: newList });
      if (viewingItem?.id === id) setViewingItem(null);
      setDeleteConfirmId(null);

      // 从向量数据库中删除
      try {
        await vectorIntegrationService.cleanupProject(project.id);
        // 重新索引剩余的知识库项目
        if (newList.length > 0) {
          await indexKnowledgeItems(newList);
        }
      } catch (error) {
        console.error('从向量数据库删除失败:', error);
      }
    } else {
      // 第一次点击 - 请求确认
      setDeleteConfirmId(id);
      setTimeout(() => {
        setDeleteConfirmId(prev => (prev === id ? null : prev));
      }, 3000);
    }
  };

  // 保存编辑
  const handleSave = async () => {
    if (!viewingItem) return;
    
    const updatedList = (project.knowledge || []).map(item => {
      if (item.id === viewingItem.id) {
        return { 
          ...item, 
          content: editContent, 
          name: editName,
          category: editCategory,
          size: new Blob([editContent]).size
        };
      }
      return item;
    });
    
    onUpdate({ knowledge: updatedList });
    
    // 更新查看的项目以反映保存的状态
    setViewingItem(prev => prev ? ({ ...prev, content: editContent, name: editName, category: editCategory }) : null);
    setIsDirty(false);

    // 更新向量数据库
    try {
      const updatedItem = updatedList.find(item => item.id === viewingItem.id);
      if (updatedItem) {
        await vectorIntegrationService.batchUpdateKnowledge(project.id, [{
          action: 'update',
          item: updatedItem
        }]);
        
        // 更新统计信息
        const stats = await vectorIntegrationService.getVectorStats(project.id);
        setVectorStats(stats);
      }
    } catch (error) {
      console.error('更新向量数据库失败:', error);
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 格式化相似度分数
  const formatScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      {/* 固定头部区域 */}
      <div className="flex-none p-8 pb-4">
        <div className="flex justify-between items-end border-b pb-6 border-gray-100">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">世界构建中心</h2>
            <p className="text-gray-500 mt-1 italic font-medium">管理世界观设定、地点、势力、时间线和规则系统。构建完整的小说世界。</p>
          </div>
          
          {/* 向量统计信息 */}
          {vectorStats && (
            <div className="flex items-center gap-4 text-sm">
              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <span className="font-bold">{vectorStats.count}</span> 个向量文档
              </div>
              <div className="px-3 py-1 bg-green-50 text-green-600 rounded-lg border border-green-100">
                <span className="font-bold">{vectorStats.dimensions}</span> 维嵌入
              </div>
            </div>
          )}
        </div>

        {/* 搜索栏 */}
        <div className="mt-6">
          <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="输入关键词或描述进行智能搜索..."
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            <button
              onClick={() => handleSemanticSearch(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  搜索中...
                </>
              ) : (
                <>
                  <i className="fas fa-search mr-2"></i>
                  搜索
                </>
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3">
            <button
              onClick={() => setSearchMode('hybrid')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                searchMode === 'hybrid' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="混合搜索：结合语义和关键词"
            >
              <i className="fas fa-robot"></i>
              <span className="hidden sm:inline">混合</span>
            </button>
            <button
              onClick={() => setSearchMode('semantic')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                searchMode === 'semantic' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="语义搜索：基于内容含义"
            >
              <i className="fas fa-brain"></i>
              <span className="hidden sm:inline">语义</span>
            </button>
            <button
              onClick={() => setSearchMode('keyword')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                searchMode === 'keyword' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="关键词搜索：传统文本匹配"
            >
              <i className="fas fa-search"></i>
              <span className="hidden sm:inline">关键词</span>
            </button>
          </div>
        </div>

        {/* 搜索模式说明 */}
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>混合搜索：智能结合语义和关键词</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>语义搜索：理解内容含义</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>关键词搜索：传统文本匹配</span>
          </div>
        </div>
      </div>
      </div>{/* 固定头部区域结束 */}

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">

      {/* 世界观数据总览卡片 */}
      <div className="grid grid-cols-5 gap-3">
        {/* 世界观设定 */}
        <div className={`p-4 rounded-xl border transition-all ${
          project.worldView ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.worldView ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <i className="fas fa-globe text-lg"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">世界观</h4>
              <p className="text-xs text-gray-500">
                {project.worldView ? '已设定' : '未设定'}
              </p>
            </div>
          </div>
        </div>

        {/* 地点统计 */}
        <div className={`p-4 rounded-xl border transition-all ${
          project.locations?.length ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.locations?.length ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <i className="fas fa-map-marked-alt text-lg"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">地点</h4>
              <p className="text-xs text-gray-500">
                {project.locations?.length ? `${project.locations.length} 个` : '未定义'}
              </p>
            </div>
          </div>
        </div>

        {/* 势力统计 */}
        <div className={`p-4 rounded-xl border transition-all ${
          project.factions?.length ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.factions?.length ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <i className="fas fa-flag text-lg"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">势力</h4>
              <p className="text-xs text-gray-500">
                {project.factions?.length ? `${project.factions.length} 个` : '未定义'}
              </p>
            </div>
          </div>
        </div>

        {/* 时间线统计 */}
        <div className={`p-4 rounded-xl border transition-all ${
          project.timeline?.events?.length ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.timeline?.events?.length ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <i className="fas fa-clock text-lg"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">时间线</h4>
              <p className="text-xs text-gray-500">
                {project.timeline?.events?.length ? `${project.timeline.events.length} 个事件` : '未定义'}
              </p>
            </div>
          </div>
        </div>

        {/* 规则系统统计 */}
        <div className={`p-4 rounded-xl border transition-all ${
          project.ruleSystems?.length ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.ruleSystems?.length ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <i className="fas fa-cogs text-lg"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">规则系统</h4>
              <p className="text-xs text-gray-500">
                {project.ruleSystems?.length ? `${project.ruleSystems.length} 个` : '未定义'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索结果显示 */}
      {showSearchResults && searchResults.length > 0 && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">
              搜索结果 ({searchResults.length} 条)
              <span className="ml-2 text-sm font-normal text-gray-500">
                {searchMode === 'hybrid' ? '混合搜索' : searchMode === 'semantic' ? '语义搜索' : '关键词搜索'}
              </span>
            </h3>
            <button
              onClick={() => setShowSearchResults(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={result.document.id}
                className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  const item = project.knowledge?.find(k => k.id === result.document.knowledgeItemId);
                  if (item) {
                    setViewingItem(item);
                    setShowSearchResults(false);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm">
                      {result.metadata?.name || '未命名文档'}
                      <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {result.metadata?.category || '未知'}
                      </span>
                    </h4>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {result.content}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">
                      {formatScore(result.combinedScore)}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${
                        result.semanticScore > result.keywordScore 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {result.semanticScore > result.keywordScore ? '语义' : '关键词'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 2: 地点与势力快速入口 */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowLocationEditor(!showLocationEditor);
            setShowFactionEditor(false);
            setShowTimelineEditor(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${
            showLocationEditor
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-white border-gray-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                project.locations?.length ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
              }`}>
                <i className="fas fa-map-marked-alt text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">地点管理</h4>
                <p className="text-xs text-gray-500">
                  {project.locations?.length 
                    ? `已定义 ${project.locations.length} 个地点` 
                    : '定义小说中的地理场景'}
                </p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showLocationEditor ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </button>

        <button
          onClick={() => {
            setShowFactionEditor(!showFactionEditor);
            setShowLocationEditor(false);
            setShowTimelineEditor(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${
            showFactionEditor
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-gray-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                project.factions?.length ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
              }`}>
                <i className="fas fa-flag text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">势力管理</h4>
                <p className="text-xs text-gray-500">
                  {project.factions?.length 
                    ? `已定义 ${project.factions.length} 个势力` 
                    : '定义小说中的派系与组织'}
                </p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showFactionEditor ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </button>

        {/* Phase 3: 时间线入口 */}
        <button
          onClick={() => {
            setShowTimelineEditor(!showTimelineEditor);
            setShowLocationEditor(false);
            setShowFactionEditor(false);
            setShowRuleSystemEditor(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${
            showTimelineEditor
              ? 'bg-indigo-50 border-indigo-200'
              : 'bg-white border-gray-200 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                project.timeline?.events?.length ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
              }`}>
                <i className="fas fa-clock text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">时间线</h4>
                <p className="text-xs text-gray-500">
                  {project.timeline?.events?.length 
                    ? `已定义 ${project.timeline.events.length} 个事件` 
                    : '管理故事时间线和角色年龄'}
                </p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showTimelineEditor ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </button>

        {/* Phase 4: 规则系统入口 */}
        <button
          onClick={() => {
            setShowRuleSystemEditor(!showRuleSystemEditor);
            setShowLocationEditor(false);
            setShowFactionEditor(false);
            setShowTimelineEditor(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${
            showRuleSystemEditor
              ? 'bg-rose-50 border-rose-200'
              : 'bg-white border-gray-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                project.ruleSystems?.length ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'
              }`}>
                <i className="fas fa-cogs text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">规则系统</h4>
                <p className="text-xs text-gray-500">
                  {project.ruleSystems?.length 
                    ? `已定义 ${project.ruleSystems.length} 个系统` 
                    : '修炼等级、货币、职业等规则'}
                </p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showRuleSystemEditor ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </button>

        {/* Phase 5: 世界观图谱入口 */}
        <button
          onClick={() => {
            setShowWorldViewGraph(true);
            setGraphInitialType('mixed');
          }}
          className="flex-1 p-4 rounded-xl border transition-all text-left bg-white border-gray-200 hover:border-cyan-200 hover:bg-cyan-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                (project.characters?.length || project.factions?.length || project.locations?.length) 
                  ? 'bg-cyan-100 text-cyan-600' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                <i className="fas fa-project-diagram text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">世界观图谱</h4>
                <p className="text-xs text-gray-500">
                  可视化角色、势力、地点、事件关系
                </p>
              </div>
            </div>
            <i className="fas fa-external-link-alt text-gray-400 text-xs"></i>
          </div>
        </button>

        {/* Phase 6: 增强时间线入口 */}
        <button
          onClick={() => {
            setShowEnhancedTimeline(!showEnhancedTimeline);
            setShowConsistencyChecker(false);
            setShowSmartRecommender(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${
            showEnhancedTimeline
              ? 'bg-purple-50 border-purple-200'
              : 'bg-white border-gray-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                project.timeline?.events?.length ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
              }`}>
                <i className="fas fa-stream text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">增强时间线</h4>
                <p className="text-xs text-gray-500">
                  章节与事件叠加的时间线视图
                </p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showEnhancedTimeline ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </button>

        {/* Phase 6: 一致性检查入口 */}
        <button
          onClick={() => {
            setShowConsistencyChecker(!showConsistencyChecker);
            setShowEnhancedTimeline(false);
            setShowSmartRecommender(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${
            showConsistencyChecker
              ? 'bg-rose-50 border-rose-200'
              : 'bg-white border-gray-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-100 text-rose-600">
                <i className="fas fa-stethoscope text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">一致性检查</h4>
                <p className="text-xs text-gray-500">
                  检查世界观数据的逻辑一致性
                </p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showConsistencyChecker ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </button>

        {/* Phase 6: 智能推荐入口 */}
        <button
          onClick={() => {
            setShowSmartRecommender(!showSmartRecommender);
            setShowEnhancedTimeline(false);
            setShowConsistencyChecker(false);
          }}
          className={`flex-1 p-4 rounded-xl border transition-all text-left ${
            showSmartRecommender
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-gray-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600">
                <i className="fas fa-lightbulb text-lg"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">智能推荐</h4>
                <p className="text-xs text-gray-500">
                  基于场景推荐相关世界观元素
                </p>
              </div>
            </div>
            <i className={`fas fa-chevron-${showSmartRecommender ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </button>
      </div>

      {/* 地点编辑器 */}
      {showLocationEditor && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm animate-in fade-in max-h-[500px] overflow-y-auto">
          <LocationEditor
            projectId={project.id}
            locations={project.locations || []}
            factions={project.factions || []}
            onSave={(locations) => {
              onUpdate({ locations });
            }}
          />
        </div>
      )}

      {/* Phase 3: 时间线编辑器 */}
      {showTimelineEditor && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-sm animate-in fade-in max-h-[600px] overflow-y-auto">
          <TimelineEditor
            projectId={project.id}
            timeline={project.timeline}
            characters={project.characters || []}
            locations={project.locations || []}
            factions={project.factions || []}
            chapters={project.chapters || []}
            onSave={(timeline) => {
              onUpdate({ timeline });
            }}
          />
        </div>
      )}

      {/* Phase 4: 规则系统编辑器 */}
      {showRuleSystemEditor && (
        <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm animate-in fade-in max-h-[600px] overflow-y-auto">
          <RuleSystemEditor
            projectId={project.id}
            ruleSystems={project.ruleSystems || []}
            characters={project.characters || []}
            onSave={(ruleSystems) => {
              onUpdate({ ruleSystems });
            }}
          />
        </div>
      )}

      {/* Phase 6: 增强时间线 */}
      {showEnhancedTimeline && (
        <div className="animate-in fade-in">
          <EnhancedTimeline
            project={project}
            onEventClick={(event) => {
              // 可以导航到事件编辑器
              console.log('点击事件:', event);
            }}
            onChapterClick={(chapter) => {
              // 可以导航到章节
              console.log('点击章节:', chapter);
            }}
            showChapters={true}
          />
        </div>
      )}

      {/* Phase 6: 一致性检查 */}
      {showConsistencyChecker && (
        <div className="animate-in fade-in">
          <ConsistencyChecker
            project={project}
            model={activeModel}
            embeddingConfig={activeEmbeddingConfig || undefined}
            consistencyPrompts={consistencyPrompts}
            consistencyConfig={consistencyConfig || undefined}
            onFixIssues={(fixedProject) => {
              onUpdate(fixedProject);
              alert('已自动修复可修复的问题');
            }}
            onNavigateToItem={(type, id) => {
              console.log('导航到:', type, id);
              // 可以实现跳转到对应编辑器
            }}
          />
        </div>
      )}

      {/* Phase 6: 智能推荐 */}
      {showSmartRecommender && (
        <div className="animate-in fade-in">
          <SmartRecommender
            project={project}
            context={{
              selectedCharacters: project.characters?.slice(0, 2).map(c => c.id),
              selectedLocation: project.locations?.[0]?.id,
              currentContent: ''
            }}
            onSelectItem={(item) => {
              console.log('选择推荐项:', item);
            }}
            onViewItem={(type, id) => {
              console.log('查看:', type, id);
            }}
          />
        </div>
      )}

      {/* 势力编辑器 */}
      {showFactionEditor && (
        <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm animate-in fade-in max-h-[500px] overflow-y-auto">
          <FactionEditor
            projectId={project.id}
            factions={project.factions || []}
            locations={project.locations || []}
            characters={project.characters || []}
            onSave={(factions) => {
              onUpdate({ factions });
            }}
          />
        </div>
      )}

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
        {/* 左侧：知识库列表 */}
        <div className="col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-700">知识库列表</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {(['all', 'inspiration', 'character', 'outline', 'chapter', 'writing'] as const).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {getCategoryDisplayName(category)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {getFilteredKnowledge().length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <i className="fas fa-book text-3xl mb-2"></i>
                <p>暂无知识库内容</p>
                <p className="text-sm mt-1">上传文件或创建新条目</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredKnowledge().map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${
                      viewingItem?.id === item.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setViewingItem(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 text-sm truncate">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                            {item.category === 'inspiration' ? '灵感' : 
                             item.category === 'character' ? '角色' :
                             item.category === 'outline' ? '大纲' :
                             item.category === 'chapter' ? '章节' : '正文'}
                          </span>
                          <span>{formatSize(item.size)}</span>
                          <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(e, item.id)}
                        className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                          deleteConfirmId === item.id
                            ? 'bg-red-600 text-white'
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                      >
                        {deleteConfirmId === item.id ? '确认删除' : '删除'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 文件上传区域 */}
          <div className="p-4 border-t border-gray-100">
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFiles(e.dataTransfer.files);
                }
              }}
            >
              <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
              <p className="text-gray-600">拖放文件到此处上传</p>
              <p className="text-sm text-gray-400 mt-1">支持 txt, md, json 等文本格式</p>
              <input
                type="file"
                id="file-upload"
                multiple
                accept=".txt,.md,.json,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFiles(e.target.files);
                  }
                }}
              />
              <label
                htmlFor="file-upload"
                className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
              >
                选择文件
              </label>
            </div>
            
            {/* 索引进度 */}
            {isIndexing && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-blue-700">向量化处理中...</span>
                  <span className="text-xs text-blue-600">{indexProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${indexProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：编辑区域 */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">
              {viewingItem ? '编辑内容' : '选择知识库条目进行编辑'}
            </h3>
            {viewingItem && (
              <div className="flex items-center gap-2">
                <select
                  value={editCategory}
                  onChange={(e) => {
                    setEditCategory(e.target.value as KnowledgeCategory);
                    setIsDirty(true);
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="inspiration">灵感生成</option>
                  <option value="character">世界与角色</option>
                  <option value="outline">小说大纲</option>
                  <option value="chapter">章节细纲</option>
                  <option value="writing">正文</option>
                </select>
                <button
                  onClick={handleSave}
                  disabled={!isDirty}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDirty
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  保存更改
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden">
            {viewingItem ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-100">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="输入标题..."
                    className="w-full px-4 py-2 text-lg font-bold border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <i className="fas fa-file-alt"></i>
                      <span>{formatSize(viewingItem.size)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <i className="fas fa-calendar"></i>
                      <span>{new Date(viewingItem.addedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <i className="fas fa-tag"></i>
                      <span>{viewingItem.type.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <textarea
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="输入内容..."
                    className="w-full h-full p-4 border-none resize-none outline-none font-mono text-sm"
                    style={{ minHeight: '300px' }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <i className="fas fa-edit text-4xl mb-3"></i>
                  <p>选择一个知识库条目进行编辑</p>
                  <p className="text-sm mt-1">或上传新文件开始构建知识库</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>{/* 可滚动内容区域结束 */}

      {/* Phase 5: 世界观图谱全屏弹窗 */}
      {showWorldViewGraph && (
        <WorldViewGraph
          characters={project.characters || []}
          locations={project.locations || []}
          factions={project.factions || []}
          timeline={project.timeline}
          ruleSystems={project.ruleSystems || []}
          worldView={project.worldView}
          initialType={graphInitialType}
          onClose={() => setShowWorldViewGraph(false)}
          onSelectNode={(node) => {
            console.log('选中节点:', node);
          }}
        />
      )}
    </div>
  );
};

export default StepKnowledgeEnhanced;
