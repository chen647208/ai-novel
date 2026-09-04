/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

/**
 * 世界观一致性检查面板
 * 显示并修复世界观数据的一致性问题
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation, i18n } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import { AlertTriangle, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, ExternalLink, Gavel, Info, Loader2, MapPin, RefreshCw, Stethoscope, User, Users, WandSparkles, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { 
  type Project, 
  type ModelConfig, 
  type ConsistencyCheckMode, 
  type ConsistencyCheckPromptTemplate,
  type ConsistencyCheckConfig,
  type EmbeddingModelConfig 
} from '../../../shared/types';
import { 
  type ConsistencyCheckResult,
  quickCheck,
  fixDanglingReferences,
  performAdvancedConsistencyCheck
} from '../world/services/worldConsistencyService';
import { performSimilarityCheck,} from './services/vectorSimilarityService';

interface ConsistencyCheckerProps {
  project: Project;
  model?: ModelConfig | null;
  embeddingConfig?: EmbeddingModelConfig;
  consistencyPrompts?: ConsistencyCheckPromptTemplate[];
  consistencyConfig?: ConsistencyCheckConfig;
  onFixIssues?: (fixedProject: Project) => void;
  onNavigateToItem?: (type: string, id: string) => void;
}

const ConsistencyChecker: React.FC<ConsistencyCheckerProps> = ({
  project,
  model,
  embeddingConfig,
  consistencyPrompts = [],
  consistencyConfig,
  onFixIssues,
  onNavigateToItem
}) => {
  const { t } = useTranslation(['consistency', 'common']);
  const [checkResult, setCheckResult] = useState<ConsistencyCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkMode, setCheckMode] = useState<ConsistencyCheckMode>(consistencyConfig?.mode || 'rule');
  const [checkProgress, setCheckProgress] = useState<{ completed: number; total: number; currentItem: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedType, setSelectedType] = useState<string | 'all'>('all');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  // 执行检查
  const performCheck = useCallback(async () => {
    // 验证模型配置：向量模式需要 Embedding，AI/混合模式需要 AI 模型
    let configValid = true;
    if (checkMode === 'vector' && !embeddingConfig) {
      dialogService.alert(t('consistency:needEmbedding'));
      configValid = false;
    } else if ((checkMode === 'ai' || checkMode === 'hybrid') && !model) {
      dialogService.alert(t('consistency:needModel'));
      configValid = false;
    }
    if (!configValid) {
      // 自动切换回规则检查
      setCheckMode('rule');
      return;
    }
    
    setIsChecking(true);
    setCheckProgress(null);
    
    try {
      if (checkMode === 'rule') {
        // 规则检查
        const result = quickCheck(project);
        setCheckResult(result);
      } else if (checkMode === 'vector' && embeddingConfig) {
        // 向量相似度检查
        const vectorResult = await performSimilarityCheck(
          project,
          embeddingConfig,
          {
            threshold: 0.85,
            maxResults: 10,
            categories: ['character', 'faction', 'location'],
            useAIAnalysis: false
          },
          (current, total, stage) => {
            setCheckProgress({ completed: current, total, currentItem: stage });
          }
        );
        
        // 转换为标准格式
        const standardResult: ConsistencyCheckResult = {
          issues: vectorResult.issues.map(issue => ({
            id: issue.id,
            type: issue.similarityScore > 0.9 ? 'warning' : 'info',
            category: issue.category,
            targetId: issue.targetIds[0],
            targetName: issue.targetNames[0],
            message: issue.message,
            suggestion: issue.suggestion,
            details: t('consistency:similarityDetails', { score: (issue.similarityScore * 100).toFixed(1), keywords: issue.commonKeywords.join(', ') })
          })),
          summary: {
            total: vectorResult.summary.total,
            errors: vectorResult.summary.highSimilarity,
            warnings: vectorResult.summary.mediumSimilarity,
            infos: 0
          },
          checkedAt: vectorResult.checkedAt
        };
        
        setCheckResult(standardResult);
      } else if ((checkMode === 'ai' || checkMode === 'hybrid') && model) {
        // AI 或混合检查
        const templates: Record<string, ConsistencyCheckPromptTemplate> = {};
        consistencyPrompts.forEach(p => {
          templates[p.category] = p;
        });
        
        const result = await performAdvancedConsistencyCheck(project, {
          mode: checkMode,
          model,
          templates,
          onProgress: (completed, total, currentItem) => {
            setCheckProgress({ completed, total, currentItem });
          }
        });
        
        setCheckResult(result);
      } else {
        // 默认规则检查
        const result = quickCheck(project);
        setCheckResult(result);
      }
    } catch (error) {
      console.error('一致性检查失败:', error);
    } finally {
      setIsChecking(false);
      setCheckProgress(null);
    }
  }, [project, model, embeddingConfig, checkMode, consistencyPrompts, t]);

  // 初始检查
  useEffect(() => {
    const result = quickCheck(project);
    setCheckResult(result);
  }, [project]);

  // 一键修复
  const handleAutoFix = async () => {
    if (!checkResult || checkResult.summary.errors === 0) return;

    if (await dialogService.confirm({ message: t('consistency:autoFixConfirm'), danger: true })) {
      const fixedProject = fixDanglingReferences(project);
      onFixIssues?.(fixedProject);

      // 重新检查
      setTimeout(() => performCheck(), 100);
    }
  };

  // 切换展开状态
  const toggleExpand = (issueId: string) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  // 过滤问题
  const filteredIssues = checkResult?.issues.filter(issue => {
    if (selectedCategory !== 'all' && issue.category !== selectedCategory) return false;
    if (selectedType !== 'all' && issue.type !== selectedType) return false;
    return true;
  }) || [];

  // 获取类型图标（lucide 组件 + 颜色类）
  const getTypeIcon = (type: string): { icon: LucideIcon; cls: string } => {
    switch (type) {
      case 'error': return { icon: XCircle, cls: 'text-red-500' };
      case 'warning': return { icon: AlertTriangle, cls: 'text-amber-500' };
      case 'info': return { icon: Info, cls: 'text-blue-500' };
      default: return { icon: Circle, cls: 'text-gray-400' };
    }
  };

  const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
    const { icon: Icon, cls } = getTypeIcon(type);
    return <Icon className={cn(cls, className)} />;
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'error': return t('consistency:type.error');
      case 'warning': return t('consistency:type.warning');
      case 'info': return t('consistency:type.info');
      default: return type;
    }
  };

  // 获取分类图标（lucide 组件）
  const getCategoryIcon = (category: string): LucideIcon => {
    switch (category) {
      case 'character': return User;
      case 'faction': return Users;
      case 'location': return MapPin;
      case 'chapter': return BookOpen;
      case 'timeline': return Clock;
      case 'rule': return Gavel;
      default: return Circle;
    }
  };

  // 获取分类标签
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'character': return t('consistency:category.character');
      case 'faction': return t('consistency:category.faction');
      case 'location': return t('consistency:category.location');
      case 'chapter': return t('consistency:category.chapter');
      case 'timeline': return t('consistency:category.timeline');
      case 'rule': return t('consistency:category.rule');
      default: return category;
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-lg">
      {/* 头部 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Stethoscope className="size-4 text-purple-500" />
            {t('consistency:title')}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {t('consistency:subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 检查模式选择 */}
          <select
            value={checkMode}
            onChange={(e) => setCheckMode(e.target.value as ConsistencyCheckMode)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-100"
          >
            <option value="rule">{t('consistency:mode.rule')}</option>
            <option value="vector">{t('consistency:mode.vector')}</option>
            <option value="ai">{t('consistency:mode.ai')}</option>
            <option value="hybrid">{t('consistency:mode.hybrid')}</option>
          </select>
          <button
            onClick={performCheck}
            disabled={isChecking}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-black hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isChecking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {isChecking ? t('consistency:checking') : t('consistency:recheck')}
          </button>
        </div>
      </div>

      {/* 模型配置状态提示 */}
      {(checkMode === 'vector' || checkMode === 'ai' || checkMode === 'hybrid') && (
        <div className="mb-4 flex gap-2">
          {checkMode === 'vector' && !embeddingConfig && (
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <AlertTriangle className="size-4 text-amber-500" />
              <span className="text-sm text-amber-700">
                {t('consistency:noEmbedding')}
              </span>
            </div>
          )}
          {(checkMode === 'ai' || checkMode === 'hybrid') && !model && (
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <AlertTriangle className="size-4 text-amber-500" />
              <span className="text-sm text-amber-700">
                {t('consistency:noModel')}
              </span>
            </div>
          )}
          {((checkMode === 'vector' && embeddingConfig) ||
            ((checkMode === 'ai' || checkMode === 'hybrid') && model)) && (
            <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle2 className="size-4 text-green-500" />
              <span className="text-sm text-green-700">
                {checkMode === 'vector' && embeddingConfig && t('consistency:configured', { name: embeddingConfig.name })}
                {(checkMode === 'ai' || checkMode === 'hybrid') && model && t('consistency:configured', { name: model.name })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 检查进度 */}
      {isChecking && checkProgress && (
        <div className="mb-6 bg-purple-50 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-purple-700">{checkProgress.currentItem}</span>
            <span className="text-xs text-purple-500">
              {checkProgress.completed} / {checkProgress.total}
            </span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(checkProgress.completed / checkProgress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 统计概览 */}
      {checkResult && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-gray-800">{checkResult.summary.total}</div>
            <div className="text-xs text-gray-500 font-bold uppercase">{t('consistency:summary.found')}</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-red-600">{checkResult.summary.errors}</div>
            <div className="text-xs text-red-500 font-bold uppercase">{t('consistency:summary.errors')}</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-amber-600">{checkResult.summary.warnings}</div>
            <div className="text-xs text-amber-500 font-bold uppercase">{t('consistency:summary.warnings')}</div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-blue-600">{checkResult.summary.infos}</div>
            <div className="text-xs text-blue-500 font-bold uppercase">{t('consistency:summary.infos')}</div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-400 uppercase">{t('consistency:filter.categoryLabel')}</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none"
          >
            <option value="all">{t('consistency:filter.all')}</option>
            <option value="character">{t('consistency:category.character')}</option>
            <option value="faction">{t('consistency:category.faction')}</option>
            <option value="location">{t('consistency:category.location')}</option>
            <option value="chapter">{t('consistency:category.chapter')}</option>
            <option value="timeline">{t('consistency:category.timeline')}</option>
            <option value="rule">{t('consistency:category.rule')}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-400 uppercase">{t('consistency:filter.typeLabel')}</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none"
          >
            <option value="all">{t('consistency:filter.all')}</option>
            <option value="error">{t('consistency:type.error')}</option>
            <option value="warning">{t('consistency:type.warning')}</option>
            <option value="info">{t('consistency:type.info')}</option>
          </select>
        </div>
        {checkResult && checkResult.summary.errors > 0 && (
          <button
            onClick={handleAutoFix}
            className="ml-auto px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-black hover:bg-green-700 transition-all flex items-center gap-2"
          >
            <WandSparkles className="size-4" />
            {t('consistency:autoFix')}
          </button>
        )}
      </div>

      {/* 问题列表 */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle2 className="size-10 mb-3 text-green-400" />
            <p className="text-sm">{t('consistency:noIssues')}</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`border-2 rounded-2xl p-4 transition-all cursor-pointer ${
                issue.type === 'error' ? 'border-red-100 bg-red-50/30' :
                issue.type === 'warning' ? 'border-amber-100 bg-amber-50/30' :
                'border-blue-100 bg-blue-50/30'
              }`}
              onClick={() => toggleExpand(issue.id)}
            >
              <div className="flex items-start gap-3">
                <TypeIcon type={issue.type} className="mt-0.5 size-4" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      issue.type === 'error' ? 'bg-red-100 text-red-700' :
                      issue.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {getTypeLabel(issue.type)}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      {(() => { const CatIcon = getCategoryIcon(issue.category); return <CatIcon className="size-3.5" />; })()}
                      {getCategoryLabel(issue.category)}
                    </span>
                    <span className="text-xs font-bold text-gray-700 truncate">
                      {issue.targetName}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{issue.message}</p>
                  
                  {expandedIssues.has(issue.id) && (
                    <div className="mt-3 pt-3 border-t border-gray-200/50 animate-in fade-in">
                      {issue.suggestion && (
                        <div className="mb-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase">{t('consistency:suggestionLabel')}</span>
                          <p className="text-sm text-gray-600 mt-0.5">{issue.suggestion}</p>
                        </div>
                      )}
                      {issue.details && (
                        <div className="mb-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase">{t('consistency:detailsLabel')}</span>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">{issue.details}</p>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToItem?.(issue.category, issue.targetId);
                        }}
                        className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="size-4" />
                        {t('consistency:goToEdit')}
                      </button>
                    </div>
                  )}
                </div>
                {expandedIssues.has(issue.id) ? <ChevronUp className="size-3.5 text-gray-400" /> : <ChevronDown className="size-3.5 text-gray-400" />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部信息 */}
      {checkResult && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          {t('consistency:lastCheck', { time: new Date(checkResult.checkedAt).toLocaleString(i18n.language) })}
        </div>
      )}
    </div>
  );
};

export default ConsistencyChecker;











