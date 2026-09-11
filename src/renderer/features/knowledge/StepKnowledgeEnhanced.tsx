/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { logger } from '../../shared/utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/i18n';
import { type Project, type KnowledgeItem, type KnowledgeCategory, type HybridSearchResult, type DiagramType, type ModelConfig, type EmbeddingModelConfig, type ConsistencyCheckPromptTemplate, type ConsistencyCheckConfig } from '../../../shared/types';
import { vectorIntegrationService } from './services/vectorIntegrationService';
import { searchKnowledge } from './services/knowledgeSearch';
import { useKnowledgeIndex } from './hooks/useKnowledgeIndex';
import { KnowledgeDetailPanel } from './components/KnowledgeDetailPanel';
import { KnowledgeListPanel } from './components/KnowledgeListPanel';
import { repository } from '../../shared/services/repository';
import { useProjectStore, type CommitOptions } from '@/app/stores/projectStore';
import { useUsableModel } from '@/app/stores/settingsStore';
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
import { formatPercent } from '@/shared/utils/format';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Bot, Brain, Clock, Flag, Globe, MapPinned, Search, Settings2, X } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';

interface StepKnowledgeEnhancedProps {
  project: Project;
  /** 跳转到角色区并聚焦指定角色（跨分区导航由 App 提供） */
  onNavigateToCharacter?: (id: string) => void;
  /** 跳转到写作区并打开指定章节（跨分区导航由 App 提供） */
  onNavigateToChapter?: (id: string) => void;
  /** 空态接力：去结构页（跨分区导航由 App 提供） */
  onGoSection?: (next: 'structure') => void;
}

const StepKnowledgeEnhanced: React.FC<StepKnowledgeEnhancedProps> = ({
  project,
  onNavigateToCharacter,
  onNavigateToChapter,
  onGoSection,
}) => {
  const { t } = useTranslation('knowledge');
  const [viewingItem, setViewingItem] = useState<KnowledgeItem | null>(null);
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
  
  const updateActiveProject = useProjectStore((s) => s.updateActiveProject);
  const onUpdate = (updates: Partial<Project>, opts?: CommitOptions) => updateActiveProject(updates, opts);
  const storeModel = useUsableModel();
  const [activeModel, setActiveModel] = useState<ModelConfig | null>(storeModel ?? null);
  const [activeEmbeddingConfig, setActiveEmbeddingConfig] = useState<EmbeddingModelConfig | null>(null);

  // 外部导航目标（一致性检查/智能推荐「跳转到编辑」）：type 决定打开哪个面板，id 为实体 id。
  // 面板关闭时清空，避免下次手动打开仍残留上次跳转的选中项。
  const [navTarget, setNavTarget] = useState<{ type: string; id: string } | null>(null);

  // 处理来自一致性检查器 / 智能推荐 / 增强时间线的实体导航
  const handleNavigateToItem = (type: string, id: string) => {
    if (!id) return;
    switch (type) {
      case 'location':
        setShowFactionEditor(false);
        setShowRuleSystemEditor(false);
        setShowEnhancedTimeline(false);
        setNavTarget({ type: 'location', id });
        setShowLocationEditor(true);
        break;
      case 'faction':
        setShowLocationEditor(false);
        setShowRuleSystemEditor(false);
        setShowEnhancedTimeline(false);
        setNavTarget({ type: 'faction', id });
        setShowFactionEditor(true);
        break;
      case 'rule':
        setShowLocationEditor(false);
        setShowFactionEditor(false);
        setShowEnhancedTimeline(false);
        setNavTarget({ type: 'rule', id });
        setShowRuleSystemEditor(true);
        break;
      case 'timeline':
      case 'event':
        setShowLocationEditor(false);
        setShowFactionEditor(false);
        setShowRuleSystemEditor(false);
        setNavTarget({ type: 'timeline', id });
        setShowEnhancedTimeline(true);
        break;
      case 'character':
        onNavigateToCharacter?.(id);
        break;
      case 'chapter':
        onNavigateToChapter?.(id);
        break;
      default:
        logger.debug('未知导航类型:', type, id);
    }
  };

  // 面板关闭时清除对应导航目标（仅当当前 navTarget 属于该面板）
  const clearNavTargetFor = (type: string) => {
    setNavTarget(prev => (prev && prev.type === type ? null : prev));
  };

  useEffect(() => {
    // 模型清空/全停用时同步清空本地残留，避免旧模型继续发起调用
    setActiveModel(storeModel ?? null);
  }, [storeModel]);

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
        logger.error('Failed to load configs:', error);
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


  // 上传与向量索引状态/动作统一见 useKnowledgeIndex
  const { vectorStats, setVectorStats, isIndexing, setIsIndexing, indexProgress, indexKnowledgeItems, handleFiles } = useKnowledgeIndex({
    project, onUpdate, selectedCategory, t,
  });

  const getFilteredKnowledge = (): KnowledgeItem[] => {
    const knowledge = project.knowledge || [];
    if (selectedCategory === 'all') {
      return knowledge;
    }
    return knowledge.filter(item => item.category === selectedCategory);
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
      setSearchResults(await searchKnowledge({
        projectId: project.id,
        query,
        mode: searchMode,
        categoryItems: getFilteredKnowledge(),
        search: (q, o) => repository.search(q, o),
      }));
    } catch (error) {
      logger.error('搜索失败:', error);
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
    if (!(await dialogService.confirm({ message: t('center.confirmDelete'), danger: true }))) return;
    const newList = (project.knowledge || []).filter(k => k.id !== id);
    onUpdate({ knowledge: newList });
    if (viewingItem?.id === id) setViewingItem(null);

    try {
      await vectorIntegrationService.cleanupProject(project.id);
      if (newList.length > 0) {
        await indexKnowledgeItems(newList);
      }
    } catch (error) {
      logger.error('从向量数据库删除失败:', error);
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
      logger.error('更新向量数据库失败:', error);
    }
  };

  // 一键重建索引：先清本项目向量，再全量重索（换嵌入模型/维度后修复不一致）
  const handleRebuildIndex = async (): Promise<void> => {
    const items = project.knowledge || [];
    if (items.length === 0) {
      dialogService.alert(t('center.rebuildEmpty'));
      return;
    }
    const ok = await dialogService.confirm({ message: t('center.rebuildConfirm', { count: items.length }), danger: false });
    if (!ok) return;
    setIsIndexing(true);
    try {
      await vectorIntegrationService.cleanupProject(project.id);
      await indexKnowledgeItems(items);
    } catch (error) {
      logger.error('重建索引失败:', error);
      dialogService.alert(t('center.indexError', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setIsIndexing(false);
    }
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
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={isIndexing}
                title={t('center.rebuildTitle')}
                onClick={() => void handleRebuildIndex()}
              >
                {t('center.rebuildIndex')}
              </Button>
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
                {isSearching ? <Spinner className="size-3.5" /> : <Search className="size-3.5" />}
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
              <span className="size-2 rounded-full bg-chart-1" />
              {t('center.semanticLegend')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-chart-5" />
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
                      {formatPercent(result.combinedScore)}
                    </div>
                    <span className={cn(
                      'mt-1 inline-block rounded px-1.5 py-0.5 text-xs',
                      result.semanticScore > result.keywordScore
                        ? 'bg-chart-1/10 text-chart-1'
                        : 'bg-chart-5/10 text-chart-5'
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
        setShowLocationEditor={(v) => { setShowLocationEditor(v); if (v === false) clearNavTargetFor('location'); }}
        showFactionEditor={showFactionEditor}
        setShowFactionEditor={(v) => { setShowFactionEditor(v); if (v === false) clearNavTargetFor('faction'); }}
        showTimelineEditor={showTimelineEditor}
        setShowTimelineEditor={setShowTimelineEditor}
        showRuleSystemEditor={showRuleSystemEditor}
        setShowRuleSystemEditor={(v) => { setShowRuleSystemEditor(v); if (v === false) clearNavTargetFor('rule'); }}
        showEnhancedTimeline={showEnhancedTimeline}
        setShowEnhancedTimeline={(v) => { setShowEnhancedTimeline(v); if (v === false) clearNavTargetFor('timeline'); }}
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
            initialSelectedId={navTarget?.type === 'location' ? navTarget.id : null}
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
            initialSelectedId={navTarget?.type === 'rule' ? navTarget.id : null}
            onSave={(ruleSystems) => {
              onUpdate({ ruleSystems });
            }}
          />
        </div>
      )}

      {showEnhancedTimeline && (
        <EnhancedTimeline
          project={project}
          selectedEventId={navTarget?.type === 'timeline' ? navTarget.id : undefined}
          onEventClick={(event) => {
            setNavTarget({ type: 'timeline', id: event.id });
          }}
          onChapterClick={(chapter) => {
            onNavigateToChapter?.(chapter.id);
          }}
          showChapters={true}
        />
      )}

      {showConsistencyChecker && (
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
          onNavigateToItem={handleNavigateToItem}
        />
      )}

      {showSmartRecommender && (
        <SmartRecommender
          project={project}
          context={{
            selectedCharacters: project.characters?.slice(0, 2).map(c => c.id),
            selectedLocation: project.locations?.[0]?.id,
            currentContent: ''
          }}
          onSelectItem={(item) => {
            handleNavigateToItem(item.type, item.id);
          }}
          onViewItem={handleNavigateToItem}
        />
      )}

      {showFactionEditor && (
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-card p-6">
          <FactionEditor
            projectId={project.id}
            factions={project.factions || []}
            locations={project.locations || []}
            characters={project.characters || []}
            initialSelectedId={navTarget?.type === 'faction' ? navTarget.id : null}
            onSave={(factions) => {
              onUpdate({ factions });
            }}
          />
        </div>
      )}

      <div className="grid flex-1 grid-cols-3 gap-6 overflow-hidden">
        <KnowledgeListPanel
          items={getFilteredKnowledge()}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          activeId={viewingItem?.id ?? null}
          onSelect={setViewingItem}
          onDelete={handleDeleteClick}
          onFiles={handleFiles}
          isIndexing={isIndexing}
          indexProgress={indexProgress}
          onGoSection={onGoSection}
        />

        <KnowledgeDetailPanel
          viewingItem={viewingItem}
          editName={editName}
          editContent={editContent}
          editCategory={editCategory}
          isDirty={isDirty}
          onNameChange={(v) => { setEditName(v); setIsDirty(true); }}
          onContentChange={(v) => { setEditContent(v); setIsDirty(true); }}
          onCategoryChange={(v) => { setEditCategory(v); setIsDirty(true); }}
          onSave={handleSave}
        />
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



