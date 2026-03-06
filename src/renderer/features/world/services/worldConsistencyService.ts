/**
 * 世界观一致性检查服务
 * 提供世界观数据一致性验证
 */

import { Project, Character, Faction, Location, Chapter, TimelineEvent, ModelConfig, ConsistencyCheckMode, EmbeddingModelConfig, ConsistencyCheckPromptTemplate } from '../../../../shared/types';
import { performSemanticCheck, SemanticCheckResult } from '../../assistant/services/aiSemanticCheckService';

export interface ConsistencyIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'character' | 'faction' | 'location' | 'chapter' | 'timeline' | 'rule';
  targetId: string;
  targetName: string;
  message: string;
  suggestion?: string;
  details?: string;
}

export interface ConsistencyCheckResult {
  issues: ConsistencyIssue[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  checkedAt: number;
}

export interface ConsistencyCheckOptions {
  checkDanglingReferences?: boolean;
  checkTimelineConflicts?: boolean;
  checkCharacterConsistency?: boolean;
  checkFactionLogic?: boolean;
  useAI?: boolean;
  useVector?: boolean;
  mode?: ConsistencyCheckMode;
  model?: ModelConfig;
  embeddingConfig?: EmbeddingModelConfig;
}

const DEFAULT_OPTIONS: ConsistencyCheckOptions = {
  checkDanglingReferences: true,
  checkTimelineConflicts: true,
  checkCharacterConsistency: true,
  checkFactionLogic: true,
  useAI: false,
  useVector: false,
  mode: 'rule'
};

// 检查悬空引用
function checkDanglingReferences(project: Project): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const { characters = [], factions = [], locations = [], chapters = [], timeline } = project;
  
  const factionIds = new Set(factions.map(f => f.id));
  const locationIds = new Set(locations.map(l => l.id));
  const characterIds = new Set(characters.map(c => c.id));
  const eventIds = new Set(timeline?.events?.map(e => e.id) || []);
  
  // 检查角色的关联引用
  characters.forEach(char => {
    if (char.factionId && !factionIds.has(char.factionId)) {
      issues.push({
        id: `char-${char.id}-faction`,
        type: 'error',
        category: 'character',
        targetId: char.id,
        targetName: char.name,
        message: `角色「${char.name}」关联的势力不存在`,
        suggestion: '请重新选择所属势力或创建该势力',
        details: `factionId: ${char.factionId}`
      });
    }
    
    if (char.homeLocationId && !locationIds.has(char.homeLocationId)) {
      issues.push({
        id: `char-${char.id}-home`,
        type: 'warning',
        category: 'character',
        targetId: char.id,
        targetName: char.name,
        message: `角色「${char.name}」的出身地点不存在`,
        suggestion: '请重新选择出身地点'
      });
    }
    
    if (char.currentLocationId && !locationIds.has(char.currentLocationId)) {
      issues.push({
        id: `char-${char.id}-current`,
        type: 'warning',
        category: 'character',
        targetId: char.id,
        targetName: char.name,
        message: `角色「${char.name}」的当前位置不存在`,
        suggestion: '请重新选择当前位置'
      });
    }
  });
  
  // 检查势力的关联引用
  factions.forEach(faction => {
    if (faction.headquartersLocationId && !locationIds.has(faction.headquartersLocationId)) {
      issues.push({
        id: `faction-${faction.id}-hq`,
        type: 'warning',
        category: 'faction',
        targetId: faction.id,
        targetName: faction.name,
        message: `势力「${faction.name}」的总部地点不存在`,
        suggestion: '请重新选择总部地点'
      });
    }
    
    if (faction.territoryLocationIds) {
      faction.territoryLocationIds.forEach(locId => {
        if (!locationIds.has(locId)) {
          issues.push({
            id: `faction-${faction.id}-territory-${locId}`,
            type: 'warning',
            category: 'faction',
            targetId: faction.id,
            targetName: faction.name,
            message: `势力「${faction.name}」的领土地点不存在`,
            suggestion: '请清理无效的领土地点'
          });
        }
      });
    }
    
    if (faction.leaderId && !characterIds.has(faction.leaderId)) {
      issues.push({
        id: `faction-${faction.id}-leader`,
        type: 'error',
        category: 'faction',
        targetId: faction.id,
        targetName: faction.name,
        message: `势力「${faction.name}」的领袖不存在`,
        suggestion: '请重新选择领袖角色'
      });
    }
  });
  
  // 检查章节的关联引用
  chapters.forEach(chapter => {
    if (chapter.mainLocationId && !locationIds.has(chapter.mainLocationId)) {
      issues.push({
        id: `chapter-${chapter.id}-location`,
        type: 'warning',
        category: 'chapter',
        targetId: chapter.id,
        targetName: chapter.title,
        message: `章节「${chapter.title}」的主场景地点不存在`,
        suggestion: '请重新选择主场景'
      });
    }
    
    if (chapter.involvedFactionIds) {
      chapter.involvedFactionIds.forEach(factionId => {
        if (!factionIds.has(factionId)) {
          issues.push({
            id: `chapter-${chapter.id}-faction-${factionId}`,
            type: 'warning',
            category: 'chapter',
            targetId: chapter.id,
            targetName: chapter.title,
            message: `章节「${chapter.title}」涉及的势力不存在`,
            suggestion: '请清理无效的势力引用'
          });
        }
      });
    }
    
    if (chapter.timelineEventId && !eventIds.has(chapter.timelineEventId)) {
      issues.push({
        id: `chapter-${chapter.id}-event`,
        type: 'warning',
        category: 'chapter',
        targetId: chapter.id,
        targetName: chapter.title,
        message: `章节「${chapter.title}」关联的时间线事件不存在`,
        suggestion: '请重新关联时间线事件'
      });
    }
  });
  
  return issues;
}

// 检查时间线冲突
function checkTimelineConflicts(project: Project): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const { timeline } = project;
  
  if (!timeline?.events) return issues;
  
  const events = timeline.events;
  
  // 检查同一天发生的事件是否有冲突
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const e1 = events[i];
      const e2 = events[j];
      
      // 简单检查：如果标题相同可能是重复
      if (e1.title === e2.title && e1.id !== e2.id) {
        issues.push({
          id: `timeline-conflict-${e1.id}-${e2.id}`,
          type: 'warning',
          category: 'timeline',
          targetId: e1.id,
          targetName: e1.title,
          message: `事件「${e1.title}」与「${e2.title}」标题相同，可能是重复`,
          suggestion: '请检查是否为重复事件'
        });
      }
    }
  }
  
  return issues;
}

// 检查角色一致性
function checkCharacterConsistency(project: Project): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const { characters = [] } = project;
  
  const nameMap = new Map<string, string[]>();
  
  characters.forEach(char => {
    // 检查重名
    if (!nameMap.has(char.name)) {
      nameMap.set(char.name, []);
    }
    nameMap.get(char.name)!.push(char.id);
    
    // 检查年龄与描述的合理性
    if (char.age && char.background) {
      const age = parseInt(char.age);
      if (!isNaN(age)) {
        if (age < 0 || age > 200) {
          issues.push({
            id: `char-${char.id}-age-invalid`,
            type: 'warning',
            category: 'character',
            targetId: char.id,
            targetName: char.name,
            message: `角色「${char.name}」的年龄 ${age} 看起来不合理`,
            suggestion: '请检查年龄设置'
          });
        }
      }
    }
  });
  
  // 报告重名问题
  nameMap.forEach((ids, name) => {
    if (ids.length > 1) {
      issues.push({
        id: `duplicate-name-${name}`,
        type: 'info',
        category: 'character',
        targetId: ids[0],
        targetName: name,
        message: `存在 ${ids.length} 个名为「${name}」的角色`,
        suggestion: '如果这不是同一人，请考虑使用不同的名字区分'
      });
    }
  });
  
  return issues;
}

// 检查势力逻辑
function checkFactionLogic(project: Project): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const { factions = [], characters = [] } = project;
  
  factions.forEach(faction => {
    // 检查势力成员数量
    const memberCount = characters.filter(c => c.factionId === faction.id).length;
    
    if (memberCount === 0 && faction.type !== 'other') {
      issues.push({
        id: `faction-${faction.id}-members`,
        type: 'info',
        category: 'faction',
        targetId: faction.id,
        targetName: faction.name,
        message: `势力「${faction.name}」目前没有成员`,
        suggestion: '考虑为该势力添加成员角色'
      });
    }
    
    // 检查势力领袖是否也是成员
    if (faction.leaderId) {
      const leader = characters.find(c => c.id === faction.leaderId);
      if (leader && leader.factionId !== faction.id) {
        issues.push({
          id: `faction-${faction.id}-leader-member`,
          type: 'warning',
          category: 'faction',
          targetId: faction.id,
          targetName: faction.name,
          message: `势力「${faction.name}」的领袖「${leader.name}」不属于该势力`,
          suggestion: '建议将领袖的所属势力设为该势力'
        });
      }
    }
  });
  
  return issues;
}

// 执行一致性检查
export async function checkWorldConsistency(
  project: Project,
  model?: ModelConfig,
  options: ConsistencyCheckOptions = DEFAULT_OPTIONS
): Promise<ConsistencyCheckResult> {
  const allIssues: ConsistencyIssue[] = [];
  
  if (options.checkDanglingReferences) {
    allIssues.push(...checkDanglingReferences(project));
  }
  
  if (options.checkTimelineConflicts) {
    allIssues.push(...checkTimelineConflicts(project));
  }
  
  if (options.checkCharacterConsistency) {
    allIssues.push(...checkCharacterConsistency(project));
  }
  
  if (options.checkFactionLogic) {
    allIssues.push(...checkFactionLogic(project));
  }
  
  // 去重
  const uniqueIssues = allIssues.filter((issue, index, self) => 
    index === self.findIndex(i => i.id === issue.id)
  );
  
  return {
    issues: uniqueIssues,
    summary: {
      total: uniqueIssues.length,
      errors: uniqueIssues.filter(i => i.type === 'error').length,
      warnings: uniqueIssues.filter(i => i.type === 'warning').length,
      infos: uniqueIssues.filter(i => i.type === 'info').length
    },
    checkedAt: Date.now()
  };
}

// 快速检查（仅本地规则，不调用AI）
export function quickCheck(project: Project): ConsistencyCheckResult {
  const issues: ConsistencyIssue[] = [
    ...checkDanglingReferences(project),
    ...checkTimelineConflicts(project),
    ...checkCharacterConsistency(project),
    ...checkFactionLogic(project)
  ];
  
  // 去重
  const uniqueIssues = issues.filter((issue, index, self) => 
    index === self.findIndex(i => i.id === issue.id)
  );
  
  return {
    issues: uniqueIssues,
    summary: {
      total: uniqueIssues.length,
      errors: uniqueIssues.filter(i => i.type === 'error').length,
      warnings: uniqueIssues.filter(i => i.type === 'warning').length,
      infos: uniqueIssues.filter(i => i.type === 'info').length
    },
    checkedAt: Date.now()
  };
}

// 修复悬空引用
export function fixDanglingReferences(project: Project): Project {
  const fixed = { ...project };
  const { factions = [], locations = [], timeline } = fixed;
  
  const factionIds = new Set(factions.map(f => f.id));
  const locationIds = new Set(locations.map(l => l.id));
  const eventIds = new Set(timeline?.events?.map(e => e.id) || []);
  
  // 清理角色的悬空引用
  if (fixed.characters) {
    fixed.characters = fixed.characters.map(char => ({
      ...char,
      factionId: char.factionId && !factionIds.has(char.factionId) ? undefined : char.factionId,
      homeLocationId: char.homeLocationId && !locationIds.has(char.homeLocationId) ? undefined : char.homeLocationId,
      currentLocationId: char.currentLocationId && !locationIds.has(char.currentLocationId) ? undefined : char.currentLocationId
    }));
  }
  
  // 清理势力的悬空引用
  if (fixed.factions) {
    fixed.factions = fixed.factions.map(faction => ({
      ...faction,
      headquartersLocationId: faction.headquartersLocationId && !locationIds.has(faction.headquartersLocationId) 
        ? undefined 
        : faction.headquartersLocationId,
      territoryLocationIds: faction.territoryLocationIds?.filter(id => locationIds.has(id)) || [],
      leaderId: faction.leaderId && !fixed.characters?.find(c => c.id === faction.leaderId)
        ? undefined
        : faction.leaderId
    }));
  }
  
  // 清理章节的悬空引用
  if (fixed.chapters) {
    fixed.chapters = fixed.chapters.map(chapter => ({
      ...chapter,
      mainLocationId: chapter.mainLocationId && !locationIds.has(chapter.mainLocationId) 
        ? undefined 
        : chapter.mainLocationId,
      involvedFactionIds: chapter.involvedFactionIds?.filter(id => factionIds.has(id)) || [],
      timelineEventId: chapter.timelineEventId && !eventIds.has(chapter.timelineEventId)
        ? undefined
        : chapter.timelineEventId
    }));
  }
  
  return fixed;
}

/**
 * 将语义检查结果转换为标准一致性问题
 */
function convertSemanticIssuesToStandard(semanticResult: SemanticCheckResult): ConsistencyIssue[] {
  return semanticResult.issues.map(issue => {
    // 将 cross_category 映射到 rule
    const category = issue.category === 'cross_category' ? 'rule' : issue.category;
    
    return {
      id: issue.id,
      type: issue.confidence > 0.8 ? 'error' : issue.confidence > 0.5 ? 'warning' : 'info',
      category: category as ConsistencyIssue['category'],
      targetId: issue.targetIds[0] || 'unknown',
      targetName: issue.targetNames[0] || '未知',
      message: issue.message,
      suggestion: issue.suggestion,
      details: `置信度: ${Math.round(issue.confidence * 100)}%, 证据: ${issue.evidence.join('; ')}`
    };
  });
}

/**
 * 执行高级一致性检查（支持AI语义检查）
 */
export async function performAdvancedConsistencyCheck(
  project: Project,
  options: {
    mode: ConsistencyCheckMode;
    model?: ModelConfig;
    templates?: Record<string, ConsistencyCheckPromptTemplate>;
    onProgress?: (completed: number, total: number, currentItem: string) => void;
  }
): Promise<ConsistencyCheckResult> {
  const { mode, model, templates, onProgress } = options;
  
  // 基础规则检查（所有模式都执行）
  const baseIssues = [
    ...checkDanglingReferences(project),
    ...checkTimelineConflicts(project),
    ...checkCharacterConsistency(project),
    ...checkFactionLogic(project)
  ];
  
  // AI语义检查
  let aiIssues: ConsistencyIssue[] = [];
  if ((mode === 'ai' || mode === 'hybrid') && model && templates) {
    try {
      if (onProgress) {
        onProgress(0, 100, '开始AI语义检查...');
      }
      
      const semanticResult = await performSemanticCheck(
        project,
        model,
        templates,
        {
          checkCharacters: true,
          checkFactions: true,
          checkLocations: true,
          checkTimeline: false,
          checkCrossReferences: false
        },
        onProgress
      );
      
      aiIssues = convertSemanticIssuesToStandard(semanticResult);
    } catch (error) {
      console.error('AI语义检查失败:', error);
    }
  }
  
  // 合并所有问题
  const allIssues = [...baseIssues, ...aiIssues];
  
  // 去重
  const uniqueIssues = allIssues.filter((issue, index, self) => 
    index === self.findIndex(i => i.id === issue.id)
  );
  
  return {
    issues: uniqueIssues,
    summary: {
      total: uniqueIssues.length,
      errors: uniqueIssues.filter(i => i.type === 'error').length,
      warnings: uniqueIssues.filter(i => i.type === 'warning').length,
      infos: uniqueIssues.filter(i => i.type === 'info').length
    },
    checkedAt: Date.now()
  };
}





