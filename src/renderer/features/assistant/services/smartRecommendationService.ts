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
 * 智能推荐服务
 * 根据当前上下文智能推荐世界观元素
 */

import { 
  type Project, type Character, type Faction, type Location, 
  type KnowledgeItem, type AICardCommand, type ModelConfig,
  type TimelineEvent, type RuleSystem
} from '../../../../shared/types';
import { asRecord, asRecords, asStr } from '../../../shared/utils/loose';
import { i18n } from '@/i18n';
import { roleLabel } from '@/shared/utils/displayLabels';
import { renderWorldDigest } from '@core/ai';
import { AIService } from '@/shared/services/ai/aiService';

/** 可参与推荐的实体类型 */
type RecommendableItem = Character | Faction | Location | KnowledgeItem | TimelineEvent | RuleSystem;

/** 取实体的展示名：多数用 name，时间线事件用 title */
export function getDisplayName(item: RecommendableItem): string {
  if ('name' in item && typeof item.name === 'string') return item.name;
  if ('title' in item && typeof item.title === 'string') return item.title;
  return '';
}

export interface RecommendationItem {
  id: string;
  type: 'character' | 'faction' | 'location' | 'event' | 'rule';
  item: RecommendableItem;
  relevanceScore: number;
  reason: string;
  suggestedAction?: 'link' | 'reference' | 'mention';
}

export interface RecommendationContext {
  currentContent?: string;
  selectedCharacters?: string[];
  selectedLocation?: string;
  selectedFaction?: string;
  currentChapterId?: string;
  writingScene?: string;
}

export interface SmartRecommendationResult {
  recommendations: RecommendationItem[];
  context: string;
  generatedAt: number;
}

export interface RecommendationOptions {
  maxResults?: number;
  minScore?: number;
  categories?: ('character' | 'faction' | 'location' | 'event' | 'rule')[];
}

/**
 * 基于关键词匹配计算相关性
 */
function calculateKeywordRelevance(
  content: string,
  item: RecommendableItem
): number {
  const contentLower = content.toLowerCase();
  let score = 0;
  
  // 检查名称匹配
  const displayName = getDisplayName(item);
  if (displayName && contentLower.includes(displayName.toLowerCase())) {
    score += 10;
  }
  
  // 检查描述匹配（根据类型获取描述）
  let description = '';
  if ('background' in item && item.background) {
    description = item.background;
  } else if ('content' in item && typeof item.content === 'string') {
    description = item.content;
  } else if ('description' in item && typeof item.description === 'string') {
    description = item.description;
  }
  
  if (description) {
    const descWords = description.toLowerCase().split(/\s+/);
    descWords.forEach(word => {
      if (word.length > 2 && contentLower.includes(word)) {
        score += 0.5;
      }
    });
  }
  
  // 角色特殊检查：定位是枚举 id，用显示名与正文匹配（与内容同语言）
  if ('role' in item && item.role) {
    const roleText = roleLabel(String(item.role)).toLowerCase();
    if (roleText && contentLower.includes(roleText)) {
      score += 3;
    }
  }
  
  // 地点特殊检查
  if ('locationType' in item && item.locationType) {
    const locType = item.locationType as string;
    if (contentLower.includes(locType.toLowerCase())) {
      score += 3;
    }
  }
  
  return Math.min(score, 100);
}

/**
 * 基于关联关系计算相关性
 */
function calculateRelationRelevance(
  project: Project,
  targetItem: RecommendableItem,
  context: RecommendationContext
): number {
  let score = 0;
  
  // 根据目标项类型进行检查
  const isCharacter = 'role' in targetItem;
  const isFaction = 'leaderId' in targetItem;
  const isLocation = 'locationType' in targetItem;
  
  // 检查与选中角色的关联
  if (context.selectedCharacters && context.selectedCharacters.length > 0) {
    context.selectedCharacters.forEach(charId => {
      const char = project.characters?.find(c => c.id === charId);
      if (!char) return;
      
      // 角色所属势力
      if (isFaction && char.factionId === targetItem.id) {
        score += 15;
      }
      
      // 角色所在地点
      if (isLocation && 
          (char.currentLocationId === targetItem.id || char.homeLocationId === targetItem.id)) {
        score += 12;
      }
      
      // 角色相关事件
      if ('relatedCharacterIds' in targetItem && 
          Array.isArray(targetItem.relatedCharacterIds) &&
          targetItem.relatedCharacterIds?.includes(charId)) {
        score += 10;
      }
    });
  }
  
  // 检查与选中地点的关联
  if (context.selectedLocation) {
    const location = project.locations?.find(l => l.id === context.selectedLocation);
    if (location) {
      // 势力总部
      if (isFaction && 'headquartersLocationId' in targetItem && targetItem.headquartersLocationId === location.id) {
        score += 15;
      }
      
      // 势力领土
      if (isFaction && 'territoryLocationIds' in targetItem && 
          Array.isArray(targetItem.territoryLocationIds) &&
          targetItem.territoryLocationIds?.includes(location.id)) {
        score += 10;
      }
      
      // 在此地点的角色
      if (isCharacter && 
          (targetItem.currentLocationId === location.id || targetItem.homeLocationId === location.id)) {
        score += 12;
      }
    }
  }
  
  // 检查与选中势力的关联
  if (context.selectedFaction) {
    const faction = project.factions?.find(f => f.id === context.selectedFaction);
    if (faction) {
      // 势力成员
      if (isCharacter && targetItem.factionId === faction.id) {
        score += 15;
      }
      
      // 势力领袖
      if (isCharacter && faction.leaderId === targetItem.id) {
        score += 20;
      }
      
      // 势力总部地点
      if (isLocation && targetItem.id === faction.headquartersLocationId) {
        score += 12;
      }
    }
  }
  
  return score;
}

/**
 * 生成推荐理由
 */
function generateReason(
  item: RecommendableItem,
  score: number,
  context: RecommendationContext,
  project: Project
): string {
  const reasons: string[] = [];
  
  const isCharacter = 'role' in item;
  const isFaction = 'leaderId' in item;
  const isLocation = 'locationType' in item;
  
  // 基于关联生成原因
  if (context.selectedCharacters && context.selectedCharacters.length > 0) {
    context.selectedCharacters.forEach(charId => {
      const char = project.characters?.find(c => c.id === charId);
      if (!char) return;
      
      if (isFaction && char.factionId === item.id) {
        reasons.push(i18n.t('assistant:rec.reason.factionOf', { name: char.name }));
      }
      if (isLocation && char.currentLocationId === item.id) {
        reasons.push(i18n.t('assistant:rec.reason.currentLocation', { name: char.name }));
      }
      if (isLocation && char.homeLocationId === item.id) {
        reasons.push(i18n.t('assistant:rec.reason.homeLocation', { name: char.name }));
      }
    });
  }
  
  if (context.selectedLocation) {
    const location = project.locations?.find(l => l.id === context.selectedLocation);
    if (location) {
      if (isFaction && 'headquartersLocationId' in item && item.headquartersLocationId === location.id) {
        reasons.push(i18n.t('assistant:rec.reason.hqAt', { name: location.name }));
      }
      if (isCharacter && item.currentLocationId === location.id) {
        reasons.push(i18n.t('assistant:rec.reason.atLocation', { name: location.name }));
      }
    }
  }
  
  if (context.selectedFaction) {
    const faction = project.factions?.find(f => f.id === context.selectedFaction);
    if (faction) {
      if (isCharacter && item.factionId === faction.id) {
        reasons.push(i18n.t('assistant:rec.reason.factionMember', { name: faction.name }));
      }
      if (isCharacter && faction.leaderId === item.id) {
        reasons.push(i18n.t('assistant:rec.reason.factionLeader', { name: faction.name }));
      }
    }
  }
  
  // 如果分数高但没有具体原因，添加通用描述
  if (reasons.length === 0) {
    if (score > 10) {
      reasons.push(i18n.t('assistant:rec.reason.highlyRelevant'));
    } else if (score > 5) {
      reasons.push(i18n.t('assistant:rec.reason.maybeRelevant'));
    } else {
      reasons.push(i18n.t('assistant:rec.reason.supplementary'));
    }
  }

  return reasons.join(i18n.t('assistant:rec.reasonJoiner'));
}

/**
 * 生成建议操作
 */
function suggestAction(
  item: RecommendableItem,
  context: RecommendationContext
): 'link' | 'reference' | 'mention' {
  // 根据类型判断建议操作
  const itemType = getItemType(item);
  
  if (context.selectedCharacters?.length === 1 && itemType === 'character') {
    // 如果是角色间的关联，建议引用
    return 'reference';
  }
  
  if (context.selectedLocation && itemType === 'location') {
    // 地点关联，建议链接
    return 'link';
  }
  
  if (context.selectedFaction && itemType === 'faction') {
    // 势力关联，建议链接
    return 'link';
  }
  
  // 默认建议提及
  return 'mention';
}

/**
 * 获取项目类型
 */
function getItemType(item: RecommendableItem): string {
  if ('role' in item) return 'character';
  if ('memberIds' in item || 'leaderId' in item) return 'faction';
  if ('locationType' in item || 'geography' in item) return 'location';
  if ('date' in item && 'title' in item) return 'event';
  if ('levels' in item) return 'rule';
  return 'other';
}

/**
 * 获取智能推荐
 */
export function getSmartRecommendations(
  project: Project,
  context: RecommendationContext,
  options: RecommendationOptions = {}
): SmartRecommendationResult {
  const {
    maxResults = 5,
    minScore = 1,
    categories = ['character', 'faction', 'location', 'event', 'rule']
  } = options;
  
  const recommendations: RecommendationItem[] = [];
  const content = context.currentContent || '';
  
  // 收集所有候选项目
  const candidates: Array<{ item: RecommendableItem; type: RecommendationItem['type'] }> = [];
  
  if (categories.includes('character')) {
    project.characters?.forEach(c => candidates.push({ item: c, type: 'character' }));
  }
  if (categories.includes('faction')) {
    project.factions?.forEach(f => candidates.push({ item: f, type: 'faction' }));
  }
  if (categories.includes('location')) {
    project.locations?.forEach(l => candidates.push({ item: l, type: 'location' }));
  }
  if (categories.includes('event')) {
    project.timeline?.events?.forEach(e => candidates.push({ item: e, type: 'event' }));
  }
  if (categories.includes('rule')) {
    project.ruleSystems?.forEach(r => candidates.push({ item: r, type: 'rule' }));
  }
  
  // 计算每个候选的相关性
  candidates.forEach(({ item, type }) => {
    const keywordScore = calculateKeywordRelevance(content, item);
    const relationScore = calculateRelationRelevance(project, item, context);
    const totalScore = keywordScore + relationScore;
    
    if (totalScore >= minScore) {
      recommendations.push({
        id: item.id,
        type,
        item,
        relevanceScore: totalScore,
        reason: generateReason(item, totalScore, context, project),
        suggestedAction: suggestAction(item, context)
      });
    }
  });
  
  // 按相关性排序
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // 限制结果数量
  const limitedRecommendations = recommendations.slice(0, maxResults);
  
  return {
    recommendations: limitedRecommendations,
    context: generateContextDescription(context, project),
    generatedAt: Date.now()
  };
}

/**
 * 生成上下文描述
 */
function generateContextDescription(
  context: RecommendationContext,
  project: Project
): string {
  const parts: string[] = [];
  
  if (context.selectedCharacters?.length) {
    const names = context.selectedCharacters
      .map(id => project.characters?.find(c => c.id === id)?.name)
      .filter(Boolean);
    if (names.length) {
      parts.push(i18n.t('assistant:rec.ctx.characters', { names: names.join(', ') }));
    }
  }

  if (context.selectedLocation) {
    const location = project.locations?.find(l => l.id === context.selectedLocation);
    if (location) {
      parts.push(i18n.t('assistant:rec.ctx.location', { name: location.name }));
    }
  }

  if (context.selectedFaction) {
    const faction = project.factions?.find(f => f.id === context.selectedFaction);
    if (faction) {
      parts.push(i18n.t('assistant:rec.ctx.faction', { name: faction.name }));
    }
  }

  if (context.writingScene) {
    parts.push(i18n.t('assistant:rec.ctx.scene', { scene: context.writingScene }));
  }

  return parts.join(' | ') || i18n.t('assistant:rec.ctx.global');
}

/**
 * 基于卡片命令获取推荐
 */
export function getRecommendationsForCardCommand(
  project: Project,
  command: AICardCommand,
  description: string
): SmartRecommendationResult {
  const context: RecommendationContext = {
    currentContent: description
  };
  
  // 根据命令类型调整推荐类别
  const categoryMap: Record<string, ('character' | 'faction' | 'location' | 'event' | 'rule')[]> = {
    'character': ['faction', 'location'],
    'location': ['faction', 'character'],
    'faction': ['location', 'character'],
    'timeline': ['character', 'faction'],
    'rule': ['character', 'faction', 'location'],
    'event': ['character', 'faction', 'location'],
    'magic': ['character', 'rule'],
    'tech': ['character', 'faction'],
    'history': ['character', 'faction']
  };
  
  return getSmartRecommendations(project, context, {
    maxResults: 5,
    minScore: 0,
    categories: categoryMap[command] || ['character', 'faction', 'location']
  });
}

/**
 * AI增强推荐
 */
export async function getAIEnhancedRecommendations(
  project: Project,
  context: RecommendationContext,
  model: ModelConfig,
  options: {
    maxResults?: number;
  } = {}
): Promise<SmartRecommendationResult> {
  // 先获取基础推荐
  const baseResult = getSmartRecommendations(project, context, {
    maxResults: 10,
    minScore: 0
  });
  
  if (!model) {
    return baseResult;
  }
  
  try {
    const worldContext = renderWorldDigest(project);
    const writingContext = context.currentContent || context.writingScene || '';
    
    const prompt = `作为世界观专家，请分析以下写作场景并推荐最相关的世界观元素。

世界观概况：
${worldContext}

当前场景：
${writingContext}

可选元素：
${baseResult.recommendations.map(r => `- ${getDisplayName(r.item)} (${r.type}): ${r.reason}`).join('\n')}

请从以上可选元素中，选出最相关的3-5个，并说明为什么它们适合当前场景。
以JSON格式返回：
{
  "topPicks": [
    {
      "name": "元素名称",
      "reason": "推荐理由"
    }
  ]
}`;

    const response = await AIService.call(model, prompt);
    
    // 尝试提取AI推荐
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = asRecord(JSON.parse(jsonMatch[0]));
        if (Array.isArray(result.topPicks)) {
          // 将AI推荐与基础推荐合并，提升AI选中的推荐分数
          const topPicks = asRecords(result.topPicks);
          const aiPicks = new Set(topPicks.map((p) => asStr(p.name)));
          
          baseResult.recommendations.forEach(rec => {
            const recName = getDisplayName(rec.item);
            if (aiPicks.has(recName)) {
              rec.relevanceScore += 20; // AI推荐加分
              // 更新理由
              const aiPick = topPicks.find((p) => asStr(p.name) === recName);
              if (aiPick?.reason) {
                rec.reason = `${rec.reason} (AI: ${asStr(aiPick.reason)})`;
              }
            }
          });
          
          // 重新排序
          baseResult.recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }
      }
    } catch (parseError) {
      logger.warn('AI推荐解析失败:', parseError);
    }
  } catch (error) {
    logger.error('AI增强推荐失败:', error);
  }
  
  return {
    ...baseResult,
    recommendations: baseResult.recommendations.slice(0, options.maxResults || 5)
  };
}

/**
 * 获取场景推荐
 * 根据写作场景推荐世界观元素
 */
export function getSceneRecommendations(
  project: Project,
  sceneType: 'dialogue' | 'action' | 'description' | 'transition',
  locationId?: string,
  characterIds?: string[]
): SmartRecommendationResult {
  const context: RecommendationContext = {
    selectedLocation: locationId,
    selectedCharacters: characterIds,
    writingScene: sceneType
  };
  
  // 根据场景类型调整推荐策略
  const options: RecommendationOptions = {
    maxResults: 5,
    minScore: 1
  };
  
  switch (sceneType) {
    case 'dialogue':
      // 对话场景推荐角色和势力
      options.categories = ['character', 'faction'];
      break;
    case 'action':
      // 动作场景推荐地点和角色
      options.categories = ['location', 'character'];
      break;
    case 'description':
      // 描写场景推荐地点和规则
      options.categories = ['location', 'rule', 'faction'];
      break;
    case 'transition':
      // 转场推荐地点和事件
      options.categories = ['location', 'event'];
      break;
  }
  
  return getSmartRecommendations(project, context, options);
}





