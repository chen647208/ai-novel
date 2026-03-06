/**
 * 世界观一致性检查面板
 * 显示并修复世界观数据的一致性问题
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Project, 
  ModelConfig, 
  ConsistencyCheckMode, 
  ConsistencyCheckPromptTemplate,
  ConsistencyCheckConfig,
  EmbeddingModelConfig 
} from '../../../shared/types';
import { 
  ConsistencyCheckResult, 
  ConsistencyIssue,
  quickCheck,
  fixDanglingReferences,
  performAdvancedConsistencyCheck
} from '../world/services/worldConsistencyService';
import { ConsistencyCheckPromptService } from './services/consistencyCheckPromptService';
import { performSimilarityCheck, VectorCheckResult, SimilarityIssue } from './services/vectorSimilarityService';

interface ConsistencyCheckerProps {
  project: Project;
  model?: ModelConfig;
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
  const [checkResult, setCheckResult] = useState<ConsistencyCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkMode, setCheckMode] = useState<ConsistencyCheckMode>(consistencyConfig?.mode || 'rule');
  const [checkProgress, setCheckProgress] = useState<{ completed: number; total: number; currentItem: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedType, setSelectedType] = useState<string | 'all'>('all');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  // 检查模型配置是否满足要求
  const validateModelConfig = (): boolean => {
    if (checkMode === 'vector' && !embeddingConfig) {
      alert('请先配置 Embedding 模型服务商\n\n路径：系统设置 → 向量模型');
      return false;
    }
    if ((checkMode === 'ai' || checkMode === 'hybrid') && !model) {
      alert('请先配置 AI 模型服务商\n\n路径：系统设置 → 模型提供商');
      return false;
    }
    return true;
  };

  // 执行检查
  const performCheck = useCallback(async () => {
    // 验证模型配置
    if (!validateModelConfig()) {
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
            details: `相似度: ${(issue.similarityScore * 100).toFixed(1)}%, 共同关键词: ${issue.commonKeywords.join(', ')}`
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
  }, [project, model, embeddingConfig, checkMode, consistencyPrompts]);

  // 初始检查
  useEffect(() => {
    const result = quickCheck(project);
    setCheckResult(result);
  }, [project]);

  // 一键修复
  const handleAutoFix = () => {
    if (!checkResult || checkResult.summary.errors === 0) return;
    
    if (confirm('确定要自动修复所有可修复的问题吗？这将清除无效的引用。')) {
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

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return 'fa-times-circle text-red-500';
      case 'warning': return 'fa-exclamation-triangle text-amber-500';
      case 'info': return 'fa-info-circle text-blue-500';
      default: return 'fa-circle text-gray-400';
    }
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'error': return '错误';
      case 'warning': return '警告';
      case 'info': return '提示';
      default: return type;
    }
  };

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'character': return 'fa-user';
      case 'faction': return 'fa-users';
      case 'location': return 'fa-map-marker-alt';
      case 'chapter': return 'fa-book';
      case 'timeline': return 'fa-clock';
      case 'rule': return 'fa-gavel';
      default: return 'fa-circle';
    }
  };

  // 获取分类标签
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'character': return '角色';
      case 'faction': return '势力';
      case 'location': return '地点';
      case 'chapter': return '章节';
      case 'timeline': return '时间线';
      case 'rule': return '规则';
      default: return category;
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-lg">
      {/* 头部 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <i className="fas fa-stethoscope text-purple-500"></i>
            世界观一致性检查
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            检查项目数据的一致性和完整性
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 检查模式选择 */}
          <select
            value={checkMode}
            onChange={(e) => setCheckMode(e.target.value as ConsistencyCheckMode)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-100"
          >
            <option value="rule">规则检查</option>
            <option value="vector">向量相似度</option>
            <option value="ai">AI语义检查</option>
            <option value="hybrid">混合检查</option>
          </select>
          <button
            onClick={performCheck}
            disabled={isChecking}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-black hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <i className={`fas ${isChecking ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
            {isChecking ? '检查中...' : '重新检查'}
          </button>
        </div>
      </div>

      {/* 模型配置状态提示 */}
      {(checkMode === 'vector' || checkMode === 'ai' || checkMode === 'hybrid') && (
        <div className="mb-4 flex gap-2">
          {checkMode === 'vector' && !embeddingConfig && (
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <i className="fas fa-exclamation-triangle text-amber-500"></i>
              <span className="text-sm text-amber-700">
                未配置 Embedding 模型，请先配置向量模型服务商
              </span>
            </div>
          )}
          {(checkMode === 'ai' || checkMode === 'hybrid') && !model && (
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <i className="fas fa-exclamation-triangle text-amber-500"></i>
              <span className="text-sm text-amber-700">
                未配置 AI 模型，请先配置模型服务商
              </span>
            </div>
          )}
          {((checkMode === 'vector' && embeddingConfig) || 
            ((checkMode === 'ai' || checkMode === 'hybrid') && model)) && (
            <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <i className="fas fa-check-circle text-green-500"></i>
              <span className="text-sm text-green-700">
                {checkMode === 'vector' && embeddingConfig && `已配置: ${embeddingConfig.name}`}
                {(checkMode === 'ai' || checkMode === 'hybrid') && model && `已配置: ${model.name}`}
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
            <div className="text-xs text-gray-500 font-bold uppercase">发现问题</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-red-600">{checkResult.summary.errors}</div>
            <div className="text-xs text-red-500 font-bold uppercase">错误</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-amber-600">{checkResult.summary.warnings}</div>
            <div className="text-xs text-amber-500 font-bold uppercase">警告</div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-blue-600">{checkResult.summary.infos}</div>
            <div className="text-xs text-blue-500 font-bold uppercase">提示</div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-400 uppercase">分类</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none"
          >
            <option value="all">全部</option>
            <option value="character">角色</option>
            <option value="faction">势力</option>
            <option value="location">地点</option>
            <option value="chapter">章节</option>
            <option value="timeline">时间线</option>
            <option value="rule">规则</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-400 uppercase">类型</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none"
          >
            <option value="all">全部</option>
            <option value="error">错误</option>
            <option value="warning">警告</option>
            <option value="info">提示</option>
          </select>
        </div>
        {checkResult && checkResult.summary.errors > 0 && (
          <button
            onClick={handleAutoFix}
            className="ml-auto px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-black hover:bg-green-700 transition-all flex items-center gap-2"
          >
            <i className="fas fa-magic"></i>
            一键修复
          </button>
        )}
      </div>

      {/* 问题列表 */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-check-circle text-4xl mb-3 text-green-400"></i>
            <p className="text-sm">未发现一致性问题！</p>
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
                <i className={`fas ${getTypeIcon(issue.type)} mt-0.5`}></i>
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
                      <i className={`fas ${getCategoryIcon(issue.category)}`}></i>
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
                          <span className="text-[10px] font-black text-gray-400 uppercase">建议</span>
                          <p className="text-sm text-gray-600 mt-0.5">{issue.suggestion}</p>
                        </div>
                      )}
                      {issue.details && (
                        <div className="mb-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase">详情</span>
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
                        <i className="fas fa-external-link-alt"></i>
                        前往编辑
                      </button>
                    </div>
                  )}
                </div>
                <i className={`fas fa-chevron-${expandedIssues.has(issue.id) ? 'up' : 'down'} text-gray-400 text-xs`}></i>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部信息 */}
      {checkResult && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          上次检查: {new Date(checkResult.checkedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default ConsistencyChecker;











