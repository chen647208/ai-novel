/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';

/**
 * 智能推荐组件
 * 根据当前上下文推荐相关的世界观元素
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type Project, type ModelConfig } from '../../../shared/types';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { cn } from '@/shared/utils/cn';
import { CalendarDays, Circle, Eye, Gavel, Info, Lightbulb, MapPin, Plus, RefreshCw, Search, User, Users, type LucideIcon } from 'lucide-react';
import {
  type SmartRecommendationResult,
  type RecommendationItem,
  getSmartRecommendations,
  getSceneRecommendations,
  getAIEnhancedRecommendations,
  getDisplayName,
  type RecommendationContext
} from './services/smartRecommendationService';

interface SmartRecommenderProps {
  project: Project;
  model?: ModelConfig;
  context: RecommendationContext;
  onSelectItem?: (item: RecommendationItem) => void;
  onViewItem?: (type: string, id: string) => void;
  compact?: boolean;
}

const SmartRecommender: React.FC<SmartRecommenderProps> = ({
  project,
  model,
  context,
  onSelectItem,
  onViewItem,
  compact = false
}) => {
  const [recommendations, setRecommendations] = useState<SmartRecommendationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const { t } = useTranslation('assistant');

  // 获取推荐
  const fetchRecommendations = useCallback(async () => {
    if (!context.currentContent && !context.selectedCharacters?.length &&
        !context.selectedLocation && !context.selectedFaction) {
      setRecommendations(null);
      return;
    }

    setIsLoading(true);
    try {
      if (useAI && model) {
        const result = await getAIEnhancedRecommendations(project, context, model, { maxResults: 5 });
        setRecommendations(result);
      } else {
        const result = getSmartRecommendations(project, context, { maxResults: 5 });
        setRecommendations(result);
      }
    } catch (error) {
      logger.error('获取推荐失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [project, context, model, useAI]);

  // 当上下文变化时重新获取推荐
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // 获取类型图标（lucide 组件，形状区分类型）
  const getTypeIcon = (type: string): LucideIcon => {
    switch (type) {
      case 'character': return User;
      case 'faction': return Users;
      case 'location': return MapPin;
      case 'event': return CalendarDays;
      case 'rule': return Gavel;
      default: return Circle;
    }
  };

  const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
    const Icon = getTypeIcon(type);
    return <Icon className={cn('text-muted-foreground', className)} />;
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'character': return t('rec.type.character');
      case 'faction': return t('rec.type.faction');
      case 'location': return t('rec.type.location');
      case 'event': return t('rec.type.event');
      case 'rule': return t('rec.type.rule');
      default: return type;
    }
  };

  // 获取操作标签
  const getActionLabel = (action?: string) => {
    switch (action) {
      case 'link': return t('rec.action.link');
      case 'reference': return t('rec.action.reference');
      case 'mention': return t('rec.action.mention');
      default: return t('rec.action.fallback');
    }
  };

  // 获取相关性颜色
  const getRelevanceColor = (score: number) => {
    if (score >= 20) return 'text-success';
    if (score >= 10) return 'text-warning';
    return 'text-muted-foreground';
  };

  const handleSelect = (rec: RecommendationItem) => {
    setSelectedItemId(rec.id);
    onSelectItem?.(rec);
  };

  // 紧凑模式
  if (compact) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Lightbulb className="size-4 text-primary" />
            {t('rec.title')}
          </h4>
          {isLoading && <Spinner className="size-3.5 text-muted-foreground" />}
        </div>

        {recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
          <div className="space-y-1">
            {recommendations.recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(rec)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(rec); } }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors',
                  selectedItemId === rec.id
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-transparent hover:bg-accent/40'
                )}
              >
                <TypeIcon type={rec.type} className="size-4" />
                <span className="flex-1 truncate text-sm text-foreground">{getDisplayName(rec.item)}</span>
                <span className={cn('text-2xs tabular-nums', getRelevanceColor(rec.relevanceScore))}>
                  {Math.round(rec.relevanceScore)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-muted-foreground">
            {isLoading ? t('rec.analyzingShort') : t('rec.noRecommendations')}
          </p>
        )}
      </div>
    );
  }

  // 完整模式
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* 头部 */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-serif text-lg font-medium text-foreground">
            <Lightbulb className="size-4 text-primary" />
            {t('rec.title')}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {recommendations?.context || t('rec.defaultContext')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="size-3.5 accent-primary"
              disabled={!model}
            />
            <span className={model ? '' : 'opacity-50'}>
              {t('rec.aiEnhanced')} {model ? '' : t('rec.aiEnhancedOff')}
            </span>
          </label>
          <Button variant="secondary" size="icon" className="size-8" onClick={fetchRecommendations} disabled={isLoading} title={t('rec.refresh')}>
            {isLoading ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
          </Button>
        </div>
      </div>

      {/* 推荐列表 */}
      <div className="space-y-3">
        {recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
          recommendations.recommendations.map((rec) => (
            <div
              key={rec.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(rec)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(rec); } }}
              className={cn(
                'cursor-pointer rounded-lg border p-4 transition-colors',
                selectedItemId === rec.id
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-card hover:border-primary/30'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <TypeIcon type={rec.type} className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-2xs text-muted-foreground">
                      {getTypeLabel(rec.type)}
                    </span>
                    {rec.suggestedAction && (
                      <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-2xs text-primary">
                        {t('rec.suggested', { action: getActionLabel(rec.suggestedAction) })}
                      </span>
                    )}
                    <span className={cn('ml-auto text-2xs tabular-nums', getRelevanceColor(rec.relevanceScore))}>
                      {t('rec.relevance', { score: Math.round(rec.relevanceScore) })}
                    </span>
                  </div>
                  <h4 className="mb-0.5 font-serif text-sm font-medium text-foreground">{getDisplayName(rec.item)}</h4>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {'description' in rec.item && rec.item.description
                      ? rec.item.description
                      : t('rec.noDescription')}
                  </p>
                  {rec.reason && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-primary">
                      <Info className="size-3.5 shrink-0" />
                      {rec.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewItem?.(rec.type, rec.id);
                  }}
                >
                  <Eye className="size-3.5" />
                  {t('rec.viewDetails')}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(rec);
                  }}
                >
                  <Plus className="size-3.5" />
                  {getActionLabel(rec.suggestedAction)}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center">
            <Search className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isLoading ? t('rec.analyzingFull') : t('rec.emptyHint')}
            </p>
          </div>
        )}
      </div>

      {/* 场景推荐快捷入口 */}
      <div className="mt-5 border-t border-border pt-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('rec.sceneTitle')}</h4>
        <div className="flex flex-wrap gap-2">
          {([
            { type: 'dialogue', scene: t('rec.scene.dialogue') },
            { type: 'action', scene: t('rec.scene.action') },
            { type: 'description', scene: t('rec.scene.description') },
            { type: 'transition', scene: t('rec.scene.transition') },
          ] as const).map(({ type, scene }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                const result = getSceneRecommendations(project, type, context.selectedLocation, context.selectedCharacters);
                setRecommendations(result);
              }}
              className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              {t('rec.sceneLabel', { scene })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmartRecommender;
