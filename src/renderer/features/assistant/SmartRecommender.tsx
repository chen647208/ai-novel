/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 智能推荐组件
 * 根据当前上下文推荐相关的世界观元素
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type Project, type ModelConfig } from '../../../shared/types';
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
      console.error('获取推荐失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [project, context, model, useAI]);

  // 当上下文变化时重新获取推荐
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'character': return 'fa-user text-blue-500';
      case 'faction': return 'fa-users text-purple-500';
      case 'location': return 'fa-map-marker-alt text-green-500';
      case 'event': return 'fa-calendar-alt text-orange-500';
      case 'rule': return 'fa-gavel text-red-500';
      default: return 'fa-circle text-gray-400';
    }
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
    if (score >= 20) return 'text-green-600';
    if (score >= 10) return 'text-amber-600';
    return 'text-gray-500';
  };

  // 紧凑模式
  if (compact) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-black text-gray-700 flex items-center gap-2">
            <i className="fas fa-lightbulb text-amber-500"></i>
            {t('rec.title')}
          </h4>
          {isLoading && <i className="fas fa-spinner fa-spin text-xs text-gray-400"></i>}
        </div>
        
        {recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
          <div className="space-y-2">
            {recommendations.recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                onClick={() => {
                  setSelectedItemId(rec.id);
                  onSelectItem?.(rec);
                }}
                className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${
                  selectedItemId === rec.id ? 'bg-amber-50 border-amber-200' : 'hover:bg-gray-50'
                } border border-transparent`}
              >
                <i className={`fas ${getTypeIcon(rec.type)} w-4`}></i>
                <span className="text-sm text-gray-700 truncate flex-1">{getDisplayName(rec.item)}</span>
                <span className={`text-[10px] font-bold ${getRelevanceColor(rec.relevanceScore)}`}>
                  {Math.round(rec.relevanceScore)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">
            {isLoading ? t('rec.analyzingShort') : t('rec.noRecommendations')}
          </p>
        )}
      </div>
    );
  }

  // 完整模式
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-lg">
      {/* 头部 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <i className="fas fa-lightbulb text-amber-500"></i>
            {t('rec.title')}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {recommendations?.context || t('rec.defaultContext')}
          </p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              disabled={!model}
            />
            <span className={model ? '' : 'text-gray-400'}>
              {t('rec.aiEnhanced')} {model ? '' : t('rec.aiEnhancedOff')}
            </span>
          </label>
          <button
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
          </button>
        </div>
      </div>

      {/* 推荐列表 */}
      <div className="space-y-3">
        {recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
          recommendations.recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`border-2 rounded-2xl p-4 transition-all cursor-pointer ${
                selectedItemId === rec.id 
                  ? 'border-amber-300 bg-amber-50/50' 
                  : 'border-gray-100 hover:border-amber-100 bg-white'
              }`}
              onClick={() => {
                setSelectedItemId(rec.id);
                onSelectItem?.(rec);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <i className={`fas ${getTypeIcon(rec.type)} text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {getTypeLabel(rec.type)}
                    </span>
                    {rec.suggestedAction && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {t('rec.suggested', { action: getActionLabel(rec.suggestedAction) })}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold ml-auto ${getRelevanceColor(rec.relevanceScore)}`}>
                      {t('rec.relevance', { score: Math.round(rec.relevanceScore) })}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-1">{getDisplayName(rec.item)}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {'description' in rec.item && rec.item.description
                      ? rec.item.description
                      : t('rec.noDescription')}
                  </p>
                  {rec.reason && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <i className="fas fa-info-circle"></i>
                      {rec.reason}
                    </p>
                  )}
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewItem?.(rec.type, rec.id);
                  }}
                  className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-1"
                >
                  <i className="fas fa-eye"></i>
                  {t('rec.viewDetails')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectItem?.(rec);
                  }}
                  className="flex-1 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all flex items-center justify-center gap-1"
                >
                  <i className="fas fa-plus"></i>
                  {getActionLabel(rec.suggestedAction)}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-search text-4xl mb-3 text-gray-300"></i>
            <p className="text-sm">
              {isLoading ? t('rec.analyzingFull') : t('rec.emptyHint')}
            </p>
          </div>
        )}
      </div>

      {/* 场景推荐快捷入口 */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h4 className="text-xs font-black text-gray-400 uppercase mb-3">{t('rec.sceneTitle')}</h4>
        <div className="flex flex-wrap gap-2">
          {([
            { type: 'dialogue', scene: t('rec.scene.dialogue') },
            { type: 'action', scene: t('rec.scene.action') },
            { type: 'description', scene: t('rec.scene.description') },
            { type: 'transition', scene: t('rec.scene.transition') },
          ] as const).map(({ type, scene }) => (
            <button
              key={type}
              onClick={() => {
                const result = getSceneRecommendations(project, type, context.selectedLocation, context.selectedCharacters);
                setRecommendations(result);
              }}
              className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all"
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








