/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { logger } from '../../shared/utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/i18n';
import { type Project, type KnowledgeItem, type KnowledgeCategory, type HybridSearchResult, type DiagramType, type ModelConfig, type EmbeddingModelConfig, type ConsistencyCheckPromptTemplate, type ConsistencyCheckConfig } from '../../../shared/types';
import { vectorIntegrationService } from './services/vectorIntegrationService';
import { repository } from '../../shared/services/repository';
import { embeddingModelService } from '../settings/services/embeddingModelService';
import LocationEditor from '../world/LocationEditor';
import FactionEditor from '../world/FactionEditor';
import TimelineEditor from '../timeline/TimelineEditor';
import RuleSystemEditor from '../world/RuleSystemEditor';
import WorldViewGraph from '../world/WorldViewGraph';
import ConsistencyChecker from '../consistency/ConsistencyChecker';
import SmartRecommender from '../assistant/SmartRecommender';
import EnhancedTimeline from '../timeline/EnhancedTimeline';
import KnowledgeFeaturePanels from './components/KnowledgeFeaturePanels';
import { dialogService } from '@/shared/services/dialogService';
import { BookOpen, Bot, Brain, Calendar, Clock, CloudUpload, FileText, Flag, Globe, Loader2, MapPinned, PenLine, Search, Settings2, Tag, X } from 'lucide-react';

interface StepKnowledgeEnhancedProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
  activeModel?: ModelConfig | null;
}

const StepKnowledgeEnhanced: React.FC<StepKnowledgeEnhancedProps> = ({ project, onUpdate, activeModel: propActiveModel }) => {
  const { t, i18n } = useTranslation('knowledge');
  const [dragActive, setDragActive] = useState(false);
  const [viewingItem, setViewingItem] = useState<KnowledgeItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');

  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<KnowledgeCategory>('writing');
  const [isDirty, setIsDirty] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HybridSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic' | 'hybrid'>('hybrid');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [vectorStats, setVectorStats] = useState<{ count: number; dimensions: number; categories: Record<string, number> } | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);

  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [showFactionEditor, setShowFactionEditor] = useState(false);
  
  const [showTimelineEditor, setShowTimelineEditor] = useState(false);
  
  const [showRuleSystemEditor, setShowRuleSystemEditor] = useState(false);
  
  const [showWorldViewGraph, setShowWorldViewGraph] = useState(false);
  const [graphInitialType, setGraphInitialType] = useState<DiagramType>('mixed');
  
  const [showConsistencyChecker, setShowConsistencyChecker] = useState(false);
  const [showSmartRecommender, setShowSmartRecommender] = useState(false);
  const [showEnhancedTimeline, setShowEnhancedTimeline] = useState(false);
  const [consistencyPrompts, setConsistencyPrompts] = useState<ConsistencyCheckPromptTemplate[]>([]);
  const [consistencyConfig, setConsistencyConfig] = useState<ConsistencyCheckConfig | null>(null);
  
  const [activeModel, setActiveModel] = useState<ModelConfig | null>(propActiveModel || null);
  const [activeEmbeddingConfig, setActiveEmbeddingConfig] = useState<EmbeddingModelConfig | null>(null);

  useEffect(() => {
    if (propActiveModel) {
      setActiveModel(propActiveModel);
    }
  }, [propActiveModel]);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const prompts = await repository.loadConsistencyPrompts();
        const config = await repository.loadConsistencyCheckConfig();
        
        if (prompts) setConsistencyPrompts(prompts);
        if (config) setConsistencyConfig(config);
        
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

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (viewingItem) {
      setEditContent(viewingItem.content);
      setEditName(viewingItem.name);
      setEditCategory(viewingItem.category);
      setIsDirty(false);
    }
  }, [viewingItem]);

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

  const getCategoryDisplayName = (category: KnowledgeCategory | 'all'): string =>
    t(`category.${category}`);

  const getFilteredKnowledge = (): KnowledgeItem[] => {
    const knowledge = project.knowledge || [];
    if (selectedCategory === 'all') {
      return knowledge;
    }
    return knowledge.filter(item => item.category === selectedCategory);
  };

  const handleFiles = async (files: FileList) => {
    const newItems: KnowledgeItem[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
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
          dialogService.alert(t('readFailed', { name: file.name }));
        }
      } else {
        dialogService.alert(t('formatUnsupported', { name: file.name }));
      }
    }

    if (newItems.length > 0) {
      const updatedKnowledge = [...(project.knowledge || []), ...newItems];
      onUpdate({ knowledge: updatedKnowledge });

      await indexKnowledgeItems(newItems);
    }
  };

  const indexKnowledgeItems = async (items: KnowledgeItem[]) => {
    if (items.length === 0) return;

    setIsIndexing(true);
    setIndexProgress(0);

    try {
      logger.debug(`开始索引 ${items.length} 个知识库项目...`);
      const result = await vectorIntegrationService.indexKnowledgeBase(project.id, items);
      
      logger.debug('索引结果:', result);
      
      if (result.success) {
        const stats = await vectorIntegrationService.getVectorStats(project.id);
        logger.debug('更新后的统计信息:', stats);
        setVectorStats(stats);
        
        logger.debug(`✅ 成功索引 ${result.indexedCount} 个文档`);
      } else {
        console.error('❌ 索引失败:', result.error);
        dialogService.alert(t('center.indexFailed', { error: result.error ?? '' }));
      }
    } catch (error) {
      console.error('❌ 索引过程中出错:', error);
      dialogService.alert(t('center.indexError', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setIsIndexing(false);
      setIndexProgress(100);
    }
  };

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
        case 'semantic': {
          const semanticResults = await vectorIntegrationService.semanticSearchKnowledge(project.id, query, {
            limit: 10,
            threshold: 0.3
          });
          results = semanticResults.map(result => ({
            ...result,
            semanticScore: result.score,
            keywordScore: 0,
            combinedScore: result.score
          }));
          break;
        }
        case 'hybrid':
          results = await vectorIntegrationService.hybridSearchKnowledge(project.id, query, {
            limit: 10,
            threshold: 0.3,
            semanticWeight: 0.7,
            keywordWeight: 0.3
          });
          break;
        case 'keyword': {
          // 关键词检索优先走 FTS5(trigram) 索引；短查询(<3 字符)trigram 无法命中，回退内存子串匹配。
          // 命中集合再与当前分类过滤取交集，保留原有的分类筛选语义与 FTS 排序。
          const categoryFiltered = getFilteredKnowledge();
          let matchedItems: KnowledgeItem[];
          if (query.trim().length >= 3) {
            const hits = await repository.search(query, { projectId: project.id, limit: 50 });
            const byId = new Map(categoryFiltered.map(i => [i.id, i]));
            matchedItems = hits
              .filter(h => h.scope === 'knowledge')
              .map(h => byId.get(h.id))
              .filter((x): x is KnowledgeItem => Boolean(x));
          } else {
            const lower = query.toLowerCase();
            matchedItems = categoryFiltered.filter(item =>
              item.name.toLowerCase().includes(lower) || item.content.toLowerCase().includes(lower));
          }
          results = matchedItems.map(item => ({
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
      }

      setSearchResults(results);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

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

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      const newList = (project.knowledge || []).filter(k => k.id !== id);
      onUpdate({ knowledge: newList });
      if (viewingItem?.id === id) setViewingItem(null);
      setDeleteConfirmId(null);

      try {
        await vectorIntegrationService.cleanupProject(project.id);
        if (newList.length > 0) {
          await indexKnowledgeItems(newList);
        }
      } catch (error) {
        console.error('从向量数据库删除失败:', error);
      }
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => {
        setDeleteConfirmId(prev => (prev === id ? null : prev));
      }, 3000);
    }
  };

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
    
    setViewingItem(prev => prev ? ({ ...prev, content: editContent, name: editName, category: editCategory }) : null);
    setIsDirty(false);

    try {
      const updatedItem = updatedList.find(item => item.id === viewingItem.id);
      if (updatedItem) {
        await vectorIntegrationService.batchUpdateKnowledge(project.id, [{
          action: 'update',
          item: updatedItem
        }]);
        
        const stats = await vectorIntegrationService.getVectorStats(project.id);
        setVectorStats(stats);
      }
    } catch (error) {
      console.error('更新向量数据库失败:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex-none p-8 pb-4">
        <div className="flex justify-between items-end border-b pb-6 border-gray-100">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">{t('center.title')}</h2>
            <p className="text-gray-500 mt-1 italic font-medium">{t('center.subtitle')}</p>
          </div>

          {vectorStats && (
            <div className="flex items-center gap-4 text-sm">
              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <span className="font-bold">{vectorStats.count}</span> {t('center.vectorDocs')}
              </div>
              <div className="px-3 py-1 bg-green-50 text-green-600 rounded-lg border border-green-100">
                <span className="font-bold">{vectorStats.dimensions}</span> {t('center.dimUnit')}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('center.searchPlaceholder')}
              className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            <button
              onClick={() => handleSemanticSearch(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  {t('center.searching')}
                </>
              ) : (
                <>
                  <Search className="size-4 mr-2" />
                  {t('center.search')}
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
              title={t('center.hybridTitle')}
            >
              <Bot className="size-4" />
              <span className="hidden sm:inline">{t('center.modeHybrid')}</span>
            </button>
            <button
              onClick={() => setSearchMode('semantic')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                searchMode === 'semantic'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title={t('center.semanticTitle')}
            >
              <Brain className="size-4" />
              <span className="hidden sm:inline">{t('center.modeSemantic')}</span>
            </button>
            <button
              onClick={() => setSearchMode('keyword')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                searchMode === 'keyword'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title={t('center.keywordTitle')}
            >
              <Search className="size-4" />
              <span className="hidden sm:inline">{t('center.modeKeyword')}</span>
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>{t('center.hybridLegend')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>{t('center.semanticLegend')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>{t('center.keywordLegend')}</span>
          </div>
        </div>
      </div>
      </div>{/* 固定头部区域结束 */}

      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">

      <div className="grid grid-cols-5 gap-3">
        <div className={`p-4 rounded-xl border transition-all ${
          project.worldView ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.worldView ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Globe className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">{t('center.statsWorldview')}</h4>
              <p className="text-xs text-gray-500">
                {project.worldView ? t('center.set') : t('center.unset')}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${
          project.locations?.length ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.locations?.length ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <MapPinned className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">{t('center.statsLocation')}</h4>
              <p className="text-xs text-gray-500">
                {project.locations?.length ? t('center.countUnit', { count: project.locations.length }) : t('center.notDefined')}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${
          project.factions?.length ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.factions?.length ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Flag className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">{t('center.statsFaction')}</h4>
              <p className="text-xs text-gray-500">
                {project.factions?.length ? t('center.countUnit', { count: project.factions.length }) : t('center.notDefined')}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${
          project.timeline?.events?.length ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.timeline?.events?.length ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Clock className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">{t('center.statsTimeline')}</h4>
              <p className="text-xs text-gray-500">
                {project.timeline?.events?.length ? t('center.eventsCount', { count: project.timeline.events.length }) : t('center.notDefined')}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${
          project.ruleSystems?.length ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              project.ruleSystems?.length ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Settings2 className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">{t('center.statsRule')}</h4>
              <p className="text-xs text-gray-500">
                {project.ruleSystems?.length ? t('center.countUnit', { count: project.ruleSystems.length }) : t('center.notDefined')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showSearchResults && searchResults.length > 0 && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">
              {t('center.searchResultsTitle', { count: searchResults.length })}
              <span className="ml-2 text-sm font-normal text-gray-500">
                {searchMode === 'hybrid' ? t('center.searchModeHybrid') : searchMode === 'semantic' ? t('center.searchModeSemantic') : t('center.searchModeKeyword')}
              </span>
            </h3>
            <button
              onClick={() => setShowSearchResults(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
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
                      {result.metadata?.name || t('center.unnamedDoc')}
                      <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {result.metadata?.category || t('center.unknown')}
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
                        {result.semanticScore > result.keywordScore ? t('center.scoreSemantic') : t('center.scoreKeyword')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <KnowledgeFeaturePanels
        project={project}
        showLocationEditor={showLocationEditor}
        setShowLocationEditor={setShowLocationEditor}
        showFactionEditor={showFactionEditor}
        setShowFactionEditor={setShowFactionEditor}
        showTimelineEditor={showTimelineEditor}
        setShowTimelineEditor={setShowTimelineEditor}
        showRuleSystemEditor={showRuleSystemEditor}
        setShowRuleSystemEditor={setShowRuleSystemEditor}
        showEnhancedTimeline={showEnhancedTimeline}
        setShowEnhancedTimeline={setShowEnhancedTimeline}
        showConsistencyChecker={showConsistencyChecker}
        setShowConsistencyChecker={setShowConsistencyChecker}
        showSmartRecommender={showSmartRecommender}
        setShowSmartRecommender={setShowSmartRecommender}
        setShowWorldViewGraph={setShowWorldViewGraph}
        setGraphInitialType={setGraphInitialType}
      />

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

      {showEnhancedTimeline && (
        <div className="animate-in fade-in">
          <EnhancedTimeline
            project={project}
            onEventClick={(event) => {
              logger.debug('点击事件:', event);
            }}
            onChapterClick={(chapter) => {
              logger.debug('点击章节:', chapter);
            }}
            showChapters={true}
          />
        </div>
      )}

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
              dialogService.alert(t('center.autoFixed'));
            }}
            onNavigateToItem={(type, id) => {
              logger.debug('导航到:', type, id);
            }}
          />
        </div>
      )}

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
              logger.debug('选择推荐项:', item);
            }}
            onViewItem={(type, id) => {
              logger.debug('查看:', type, id);
            }}
          />
        </div>
      )}

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
        <div className="col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-700">{t('center.knowledgeList')}</h3>
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
                <BookOpen className="size-8 mb-2" />
                <p>{t('center.emptyContent')}</p>
                <p className="text-sm mt-1">{t('center.emptyContentHint')}</p>
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
                            {t(`categoryShort.${item.category}`)}
                          </span>
                          <span>{formatSize(item.size)}</span>
                          <span>{new Date(item.addedAt).toLocaleDateString(i18n.language)}</span>
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
                        {deleteConfirmId === item.id ? t('center.confirmDelete') : t('center.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
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
              <CloudUpload className="size-8 text-gray-400 mb-2" />
              <p className="text-gray-600">{t('center.dropTitle')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('center.dropHint')}</p>
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
                {t('selectFiles')}
              </label>
            </div>
            
            {isIndexing && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-blue-700">{t('center.indexing')}</span>
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

        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">
              {viewingItem ? t('center.editTitle') : t('center.selectToEdit')}
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
                  {(['inspiration', 'character', 'outline', 'chapter', 'writing'] as KnowledgeCategory[]).map(category => (
                    <option key={category} value={category}>{t(`category.${category}`)}</option>
                  ))}
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
                  {t('center.saveChanges')}
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
                    placeholder={t('center.titlePlaceholder')}
                    className="w-full px-4 py-2 text-lg font-bold border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <FileText className="size-4" />
                      <span>{formatSize(viewingItem.size)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="size-4" />
                      <span>{new Date(viewingItem.addedAt).toLocaleString(i18n.language)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tag className="size-4" />
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
                    placeholder={t('center.contentPlaceholder')}
                    className="w-full h-full p-4 border-none resize-none outline-none font-mono text-sm"
                    style={{ minHeight: '300px' }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <PenLine className="size-10 mb-3" />
                  <p>{t('center.emptyEditor')}</p>
                  <p className="text-sm mt-1">{t('center.emptyEditorHint')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>{/* 可滚动内容区域结束 */}

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
            logger.debug('选中节点:', node);
          }}
        />
      )}
    </div>
  );
};

export default StepKnowledgeEnhanced;



