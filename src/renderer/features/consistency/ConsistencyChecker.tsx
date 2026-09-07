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
 * 世界观一致性检查面板
 * 显示并修复世界观数据的一致性问题
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation, i18n } from '@/i18n';
import { dialogService } from '@/shared/services/dialogService';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { AlertTriangle, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, ExternalLink, Gavel, Info, MapPin, RefreshCw, Stethoscope, User, Users, WandSparkles, XCircle, type LucideIcon } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';
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
      logger.error('一致性检查失败:', error);
      dialogService.alert(t('consistency:checkFailed', { error: error instanceof Error ? error.message : String(error) }));
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

  // 获取类型图标（lucide 组件 + 语义色）
  const getTypeIcon = (type: string): { icon: LucideIcon; cls: string } => {
    switch (type) {
      case 'error': return { icon: XCircle, cls: 'text-destructive' };
      case 'warning': return { icon: AlertTriangle, cls: 'text-warning' };
      case 'info': return { icon: Info, cls: 'text-primary' };
      default: return { icon: Circle, cls: 'text-muted-foreground' };
    }
  };

  const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
    const { icon: Icon, cls } = getTypeIcon(type);
    return <Icon className={cn(cls, className)} />;
  };

  // 类型徽章样式
  const typeBadgeCls = (type: string) =>
    type === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' :
    type === 'warning' ? 'border-warning/30 bg-warning/10 text-warning' :
    'border-primary/30 bg-primary/10 text-primary';

  // 问题行容器样式
  const issueRowCls = (type: string) =>
    type === 'error' ? 'border-destructive/20 bg-destructive/5' :
    type === 'warning' ? 'border-warning/20 bg-warning/5' :
    'border-primary/20 bg-primary/5';

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
    <div className="rounded-lg border border-border bg-card p-5">
      {/* 头部 */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-serif text-lg font-medium text-foreground">
            <Stethoscope className="size-4 text-muted-foreground" />
            {t('consistency:title')}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('consistency:subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 检查模式选择 */}
          <Select
            className="h-8 w-auto text-xs"
            value={checkMode}
            onChange={(e) => setCheckMode(e.target.value as ConsistencyCheckMode)}
          >
            <option value="rule">{t('consistency:mode.rule')}</option>
            <option value="vector">{t('consistency:mode.vector')}</option>
            <option value="ai">{t('consistency:mode.ai')}</option>
            <option value="hybrid">{t('consistency:mode.hybrid')}</option>
          </Select>
          <Button size="sm" onClick={performCheck} disabled={isChecking}>
            {isChecking ? <Spinner className="size-3.5" /> : <RefreshCw className="size-3.5" />}
            {isChecking ? t('consistency:checking') : t('consistency:recheck')}
          </Button>
        </div>
      </div>

      {/* 模型配置状态提示 */}
      {(checkMode === 'vector' || checkMode === 'ai' || checkMode === 'hybrid') && (
        <div className="mb-4 flex gap-2">
          {checkMode === 'vector' && !embeddingConfig && (
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              <span className="text-sm text-warning">
                {t('consistency:noEmbedding')}
              </span>
            </div>
          )}
          {(checkMode === 'ai' || checkMode === 'hybrid') && !model && (
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              <span className="text-sm text-warning">
                {t('consistency:noModel')}
              </span>
            </div>
          )}
          {((checkMode === 'vector' && embeddingConfig) ||
            ((checkMode === 'ai' || checkMode === 'hybrid') && model)) && (
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2">
              <CheckCircle2 className="size-4 shrink-0 text-success" />
              <span className="text-sm text-success">
                {checkMode === 'vector' && embeddingConfig && t('consistency:configured', { name: embeddingConfig.name })}
                {(checkMode === 'ai' || checkMode === 'hybrid') && model && t('consistency:configured', { name: model.name })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 检查进度 */}
      {isChecking && checkProgress && (
        <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-primary">{checkProgress.currentItem}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {checkProgress.completed} / {checkProgress.total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(checkProgress.completed / checkProgress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 统计概览 */}
      {checkResult && (
        <div className="mb-5 grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <div className="font-serif text-2xl font-medium tabular-nums text-foreground">{checkResult.summary.total}</div>
            <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('consistency:summary.found')}</div>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center">
            <div className="font-serif text-2xl font-medium tabular-nums text-destructive">{checkResult.summary.errors}</div>
            <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('consistency:summary.errors')}</div>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-center">
            <div className="font-serif text-2xl font-medium tabular-nums text-warning">{checkResult.summary.warnings}</div>
            <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('consistency:summary.warnings')}</div>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <div className="font-serif text-2xl font-medium tabular-nums text-primary">{checkResult.summary.infos}</div>
            <div className="text-2xs uppercase tracking-wider text-muted-foreground">{t('consistency:summary.infos')}</div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('consistency:filter.categoryLabel')}</span>
          <Select
            className="h-8 w-auto text-xs"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">{t('consistency:filter.all')}</option>
            <option value="character">{t('consistency:category.character')}</option>
            <option value="faction">{t('consistency:category.faction')}</option>
            <option value="location">{t('consistency:category.location')}</option>
            <option value="chapter">{t('consistency:category.chapter')}</option>
            <option value="timeline">{t('consistency:category.timeline')}</option>
            <option value="rule">{t('consistency:category.rule')}</option>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('consistency:filter.typeLabel')}</span>
          <Select
            className="h-8 w-auto text-xs"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">{t('consistency:filter.all')}</option>
            <option value="error">{t('consistency:type.error')}</option>
            <option value="warning">{t('consistency:type.warning')}</option>
            <option value="info">{t('consistency:type.info')}</option>
          </Select>
        </div>
        {checkResult && checkResult.summary.errors > 0 && (
          <Button size="sm" className="ml-auto" onClick={handleAutoFix}>
            <WandSparkles className="size-3.5" />
            {t('consistency:autoFix')}
          </Button>
        )}
      </div>

      {/* 问题列表 */}
      <div className="custom-scrollbar max-h-[400px] space-y-2 overflow-y-auto">
        {filteredIssues.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto mb-2 size-8 text-success" />
            <p className="text-sm text-muted-foreground">{t('consistency:noIssues')}</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleExpand(issue.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(issue.id); } }}
              className={cn('cursor-pointer rounded-lg border p-3 transition-colors', issueRowCls(issue.type))}
            >
              <div className="flex items-start gap-3">
                <TypeIcon type={issue.type} className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={cn('rounded border px-1.5 py-0.5 text-2xs', typeBadgeCls(issue.type))}>
                      {getTypeLabel(issue.type)}
                    </span>
                    <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                      {(() => { const CatIcon = getCategoryIcon(issue.category); return <CatIcon className="size-3.5" />; })()}
                      {getCategoryLabel(issue.category)}
                    </span>
                    <span className="truncate text-xs font-medium text-foreground">
                      {issue.targetName}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{issue.message}</p>

                  {expandedIssues.has(issue.id) && (
                    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                      {issue.suggestion && (
                        <div>
                          <span className="text-2xs uppercase tracking-wider text-muted-foreground">{t('consistency:suggestionLabel')}</span>
                          <p className="mt-0.5 text-sm text-foreground">{issue.suggestion}</p>
                        </div>
                      )}
                      {issue.details && (
                        <div>
                          <span className="text-2xs uppercase tracking-wider text-muted-foreground">{t('consistency:detailsLabel')}</span>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{issue.details}</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToItem?.(issue.category, issue.targetId);
                        }}
                        className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="size-3.5" />
                        {t('consistency:goToEdit')}
                      </button>
                    </div>
                  )}
                </div>
                {expandedIssues.has(issue.id) ? <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部信息 */}
      {checkResult && (
        <div className="mt-4 border-t border-border pt-3 text-center text-xs text-muted-foreground">
          {t('consistency:lastCheck', { time: new Date(checkResult.checkedAt).toLocaleString(i18n.language) })}
        </div>
      )}
    </div>
  );
};

export default ConsistencyChecker;
