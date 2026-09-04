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
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
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
    <div className="mx-auto flex h-full max-w-7xl flex-col">
      <div className="flex-none p-8 pb-4">
        <div className="flex items-end justify-between border-b border-border pb-6">
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">{t('center.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('center.subtitle')}</p>
          </div>

          {vectorStats && (
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">{vectorStats.count}</span> {t('center.vectorDocs')}
              </span>
              <span className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">{vectorStats.dimensions}</span> {t('center.dimUnit')}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSearching && searchQuery.trim()) handleSemanticSearch(searchQuery);
                }}
                placeholder={t('center.searchPlaceholder')}
                className="pr-28"
              />
              <Button
                size="sm"
                onClick={() => handleSemanticSearch(searchQuery)}
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
              >
                {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                {isSearching ? t('center.searching') : t('center.search')}
              </Button>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
              {([
                { mode: 'hybrid' as const, icon: Bot, title: t('center.hybridTitle'), label: t('center.modeHybrid') },
                { mode: 'semantic' as const, icon: Brain, title: t('center.semanticTitle'), label: t('center.modeSemantic') },
                { mode: 'keyword' as const, icon: Search, title: t('center.keywordTitle'), label: t('center.modeKeyword') },
              ]).map(({ mode, icon: Icon, title, label }) => (
                <button
                  key={mode}
                  onClick={() => setSearchMode(mode)}
                  title={title}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    searchMode === mode
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              {t('center.hybridLegend')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-sky-500" />
              {t('center.semanticLegend')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              {t('center.keywordLegend')}
            </span>
          </div>
        </div>
      </div>{/* 固定头部区域结束 */}

      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">

      <div className="grid grid-cols-5 gap-3">
        {([
          { icon: Globe, label: t('center.statsWorldview'), value: project.worldView ? t('center.set') : t('center.unset'), active: !!project.worldView },
          { icon: MapPinned, label: t('center.statsLocation'), value: project.locations?.length ? t('center.countUnit', { count: project.locations.length }) : t('center.notDefined'), active: !!project.locations?.length },
          { icon: Flag, label: t('center.statsFaction'), value: project.factions?.length ? t('center.countUnit', { count: project.factions.length }) : t('center.notDefined'), active: !!project.factions?.length },
          { icon: Clock, label: t('center.statsTimeline'), value: project.timeline?.events?.length ? t('center.eventsCount', { count: project.timeline.events.length }) : t('center.notDefined'), active: !!project.timeline?.events?.length },
          { icon: Settings2, label: t('center.statsRule'), value: project.ruleSystems?.length ? t('center.countUnit', { count: project.ruleSystems.length }) : t('center.notDefined'), active: !!project.ruleSystems?.length },
        ]).map(({ icon: Icon, label, value, active }) => (
          <div
            key={label}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-4 transition-colors',
              active ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
            )}
          >
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-medium leading-tight">{label}</h4>
              <p className="truncate text-xs text-muted-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {showSearchResults && searchResults.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
            <h3 className="text-sm font-medium">
              {t('center.searchResultsTitle', { count: searchResults.length })}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {searchMode === 'hybrid' ? t('center.searchModeHybrid') : searchMode === 'semantic' ? t('center.searchModeSemantic') : t('center.searchModeKeyword')}
              </span>
            </h3>
            <button
              onClick={() => setShowSearchResults(false)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
              <div
                key={result.document.id}
                className="cursor-pointer border-b border-border p-4 transition-colors last:border-0 hover:bg-accent/40"
                onClick={() => {
                  const item = project.knowledge?.find(k => k.id === result.document.knowledgeItemId);
                  if (item) {
                    setViewingItem(item);
                    setShowSearchResults(false);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium">
                      {result.metadata?.name || t('center.unnamedDoc')}
                      <span className="ml-2 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                        {result.metadata?.category || t('center.unknown')}
                      </span>
                    </h4>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {result.content}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs tabular-nums text-muted-foreground">
                      {formatScore(result.combinedScore)}
                    </div>
                    <span className={cn(
                      'mt-1 inline-block rounded px-1.5 py-0.5 text-xs',
                      result.semanticScore > result.keywordScore
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    )}>
                      {result.semanticScore > result.keywordScore ? t('center.scoreSemantic') : t('center.scoreKeyword')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
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
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-card p-6">
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
        <div className="max-h-[600px] overflow-y-auto rounded-lg border border-border bg-card p-6">
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
        <div className="max-h-[600px] overflow-y-auto rounded-lg border border-border bg-card p-6">
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
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-card p-6">
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

      <div className="grid flex-1 grid-cols-3 gap-6 overflow-hidden">
        <Card className="col-span-1 flex flex-col overflow-hidden">
          <div className="flex-none border-b border-border bg-muted/30 p-4">
            <h3 className="text-sm font-medium">{t('center.knowledgeList')}</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {(['all', 'inspiration', 'character', 'outline', 'chapter', 'writing'] as const).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {getCategoryDisplayName(category)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {getFilteredKnowledge().length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={t('center.emptyContent')}
                description={t('center.emptyContentHint')}
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {getFilteredKnowledge().map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      'group cursor-pointer rounded-lg border p-3 transition-colors',
                      viewingItem?.id === item.id
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:bg-accent/40'
                    )}
                    onClick={() => setViewingItem(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium">{item.name}</h4>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5">
                            {t(`categoryShort.${item.category}`)}
                          </span>
                          <span className="tabular-nums">{formatSize(item.size)}</span>
                          <span>{new Date(item.addedAt).toLocaleDateString(i18n.language)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(e, item.id)}
                        className={cn(
                          'ml-2 shrink-0 rounded px-2 py-1 text-xs transition-colors',
                          deleteConfirmId === item.id
                            ? 'bg-destructive text-destructive-foreground'
                            : 'text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100'
                        )}
                      >
                        {deleteConfirmId === item.id ? t('center.confirmDelete') : t('center.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-none border-t border-border p-4">
            <div
              className={cn(
                'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              )}
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
              <CloudUpload className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-2 text-sm text-foreground">{t('center.dropTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('center.dropHint')}</p>
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
                className="mt-3 inline-flex h-8 cursor-pointer items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t('selectFiles')}
              </label>
            </div>

            {isIndexing && (
              <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <Loader2 className="size-3.5 animate-spin" />
                    {t('center.indexing')}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{indexProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${indexProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="col-span-2 flex flex-col overflow-hidden">
          <div className="flex flex-none items-center justify-between gap-2 border-b border-border bg-muted/30 p-4">
            <h3 className="text-sm font-medium">
              {viewingItem ? t('center.editTitle') : t('center.selectToEdit')}
            </h3>
            {viewingItem && (
              <div className="flex items-center gap-2">
                <Select
                  value={editCategory}
                  onChange={(e) => {
                    setEditCategory(e.target.value as KnowledgeCategory);
                    setIsDirty(true);
                  }}
                  className="h-8 w-auto text-sm"
                >
                  {(['inspiration', 'character', 'outline', 'chapter', 'writing'] as KnowledgeCategory[]).map(category => (
                    <option key={category} value={category}>{t(`category.${category}`)}</option>
                  ))}
                </Select>
                <Button size="sm" onClick={handleSave} disabled={!isDirty}>
                  {t('center.saveChanges')}
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {viewingItem ? (
              <div className="flex h-full flex-col">
                <div className="flex-none border-b border-border p-4">
                  <Input
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder={t('center.titlePlaceholder')}
                    className="font-serif text-lg"
                  />
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      <span className="tabular-nums">{formatSize(viewingItem.size)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {new Date(viewingItem.addedAt).toLocaleString(i18n.language)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Tag className="size-3.5" />
                      {viewingItem.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <Textarea
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder={t('center.contentPlaceholder')}
                    className="h-full min-h-[300px] w-full resize-none rounded-none border-0 bg-transparent font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  icon={PenLine}
                  title={t('center.emptyEditor')}
                  description={t('center.emptyEditorHint')}
                />
              </div>
            )}
          </div>
        </Card>
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



