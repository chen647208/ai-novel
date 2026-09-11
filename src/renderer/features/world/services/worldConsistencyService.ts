/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { logger } from '@/shared/utils/logger';

/**
 * 世界观一致性检查服务
 * 提供世界观数据一致性验证
 */

import { type Project, type ModelConfig, type ConsistencyCheckMode, type EmbeddingModelConfig, type ConsistencyCheckPromptTemplate } from '../../../../shared/types';
import { i18n } from '@/i18n';
import { performSemanticCheck, type SemanticCheckResult } from '../../assistant/services/aiSemanticCheckService';

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

export interface WorldConsistencyCheckResult {
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
        message: i18n.t('world:rules.factionDangling.message', { name: char.name }),
        suggestion: i18n.t('world:rules.factionDangling.suggestion'),
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
        message: i18n.t('world:rules.homeLocationDangling.message', { name: char.name }),
        suggestion: i18n.t('world:rules.homeLocationDangling.suggestion'),
      });
    }
    
    if (char.currentLocationId && !locationIds.has(char.currentLocationId)) {
      issues.push({
        id: `char-${char.id}-current`,
        type: 'warning',
        category: 'character',
        targetId: char.id,
        targetName: char.name,
        message: i18n.t('world:rules.currentLocationDangling.message', { name: char.name }),
        suggestion: i18n.t('world:rules.currentLocationDangling.suggestion')
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
        message: i18n.t('world:rules.hqDangling.message', { name: faction.name }),
        suggestion: i18n.t('world:rules.hqDangling.suggestion')
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
            message: i18n.t('world:rules.territoryDangling.message', { name: faction.name }),
            suggestion: i18n.t('world:rules.territoryDangling.suggestion')
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
        message: i18n.t('world:rules.leaderDangling.message', { name: faction.name }),
        suggestion: i18n.t('world:rules.leaderDangling.suggestion')
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
        message: i18n.t('world:rules.sceneDangling.message', { name: chapter.title }),
        suggestion: i18n.t('world:rules.sceneDangling.suggestion')
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
            message: i18n.t('world:rules.chapterFactionDangling.message', { name: chapter.title }),
            suggestion: i18n.t('world:rules.chapterFactionDangling.suggestion')
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
        message: i18n.t('world:rules.chapterEventDangling.message', { name: chapter.title }),
        suggestion: i18n.t('world:rules.chapterEventDangling.suggestion')
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
      if (!e1 || !e2) continue;
      
      // 简单检查：如果标题相同可能是重复
      if (e1.title === e2.title && e1.id !== e2.id) {
        issues.push({
          id: `timeline-conflict-${e1.id}-${e2.id}`,
          type: 'warning',
          category: 'timeline',
          targetId: e1.id,
          targetName: e1.title,
          message: i18n.t('world:rules.duplicateEvent.message', { name: e1.title, other: e2.title }),
          suggestion: i18n.t('world:rules.duplicateEvent.suggestion')
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
    let ids = nameMap.get(char.name);
    if (!ids) {
      ids = [];
      nameMap.set(char.name, ids);
    }
    ids.push(char.id);
    
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
            message: i18n.t('world:rules.ageInvalid.message', { name: char.name, age }),
            suggestion: i18n.t('world:rules.ageInvalid.suggestion')
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
        targetId: ids[0] ?? '',
        targetName: name,
        message: i18n.t('world:rules.duplicateName.message', { count: ids.length, name }),
        suggestion: i18n.t('world:rules.duplicateName.suggestion')
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
        message: i18n.t('world:rules.noMembers.message', { name: faction.name }),
        suggestion: i18n.t('world:rules.noMembers.suggestion')
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
        message: i18n.t('world:rules.leaderNotMember.message', { name: faction.name, leader: leader.name }),
        suggestion: i18n.t('world:rules.leaderNotMember.suggestion')
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
): Promise<WorldConsistencyCheckResult> {
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
export function quickCheck(project: Project): WorldConsistencyCheckResult {
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
      targetName: issue.targetNames[0] || i18n.t('world:rules.targetUnknown'),
      message: issue.message,
      suggestion: issue.suggestion,
      details: i18n.t('world:rules.detailsConfidence', {
        score: Math.round(issue.confidence * 100),
        evidence: issue.evidence.join('; '),
      })
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
): Promise<WorldConsistencyCheckResult> {
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
        onProgress(0, 100, i18n.t('world:rules.progressStarting'));
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
      logger.error('AI语义检查失败:', error);
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





