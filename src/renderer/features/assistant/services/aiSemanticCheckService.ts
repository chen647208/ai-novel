/**
 * AI语义检查服务
 * 使用LLM分析描述文本中的语义矛盾和逻辑不一致
 */

import { Project, Character, Faction, Location, TimelineEvent, ModelConfig, ConsistencyCheckPromptTemplate } from '../../../../shared/types';
import { AIService } from './aiService';
import { ConsistencyCheckPromptService } from '../../consistency/services/consistencyCheckPromptService';
import { buildWorldContextForPrompt } from './aiContextBuilder';

export interface SemanticIssue {
  id: string;
  type: 'semantic_contradiction' | 'logic_inconsistency' | 'narrative_gap';
  category: 'character' | 'faction' | 'location' | 'timeline' | 'cross_category';
  targetIds: string[];
  targetNames: string[];
  message: string;
  evidence: string[];
  suggestion: string;
  confidence: number;
}

export interface SemanticCheckResult {
  issues: SemanticIssue[];
  summary: {
    total: number;
    contradictions: number;
    inconsistencies: number;
    gaps: number;
    avgConfidence: number;
  };
  checkedAt: number;
}

export interface SemanticCheckConfig {
  checkCharacters?: boolean;
  checkFactions?: boolean;
  checkLocations?: boolean;
  checkTimeline?: boolean;
  checkCrossReferences?: boolean;
  batchSize?: number;
}

const DEFAULT_CONFIG: SemanticCheckConfig = {
  checkCharacters: true,
  checkFactions: true,
  checkLocations: true,
  checkTimeline: true,
  checkCrossReferences: true,
  batchSize: 3
};

/**
 * 格式化角色数据为检查文本
 */
function formatCharacterForCheck(char: Character): string {
  return `
角色名: ${char.name}
性别: ${char.gender || '未知'}
年龄: ${char.age || '未知'}
身份: ${char.role || '未知'}
性格: ${char.personality || '未知'}
外貌: ${char.appearance || '未知'}
背景: ${char.background || '未知'}
动机: ${char.motivation || '未知'}
优势: ${char.strengths || '未知'}
弱点: ${char.weaknesses || '未知'}
`.trim();
}

/**
 * 格式化势力数据为检查文本
 */
function formatFactionForCheck(faction: Faction): string {
  return `
势力名: ${faction.name}
类型: ${faction.type}
描述: ${faction.description || '未知'}
理念: ${faction.ideology || '未知'}
`.trim();
}

/**
 * 格式化地点数据为检查文本
 */
function formatLocationForCheck(location: Location): string {
  return `
地点名: ${location.name}
类型: ${location.type}
描述: ${location.description || '未知'}
地形: ${location.geography?.terrain || '未知'}
气候: ${location.geography?.climate || '未知'}
`.trim();
}

/**
 * 解析AI响应中的JSON
 */
function parseAIResponse(content: string): any {
  try {
    // 尝试直接解析
    return JSON.parse(content);
  } catch {
    // 尝试提取JSON代码块
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      content.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * 检查单个角色
 */
async function checkCharacter(
  char: Character,
  project: Project,
  model: ModelConfig,
  template: ConsistencyCheckPromptTemplate
): Promise<SemanticIssue[]> {
  try {
    const worldContext = buildWorldContextForPrompt(project);
    const charData = formatCharacterForCheck(char);
    
    const prompt = ConsistencyCheckPromptService.applyVariables(template, {
      projectTitle: project.title || '未命名项目',
      worldView: worldContext,
      characterName: char.name,
      characterData: charData
    });

    const response = await AIService.call(model, prompt);
    const result = parseAIResponse(response.content);
    
    if (!result?.issues || !Array.isArray(result.issues)) {
      return [];
    }

    return result.issues.map((issue: any, index: number) => ({
      id: `char-${char.id}-issue-${index}`,
      type: issue.type || 'semantic_contradiction',
      category: 'character',
      targetIds: [char.id],
      targetNames: [char.name],
      message: issue.message || '发现潜在问题',
      evidence: issue.evidence || [],
      suggestion: issue.suggestion || '请检查角色设定',
      confidence: issue.confidence || 0.5
    }));
  } catch (error) {
    console.error(`检查角色 ${char.name} 失败:`, error);
    return [];
  }
}

/**
 * 检查单个势力
 */
async function checkFaction(
  faction: Faction,
  project: Project,
  model: ModelConfig,
  template: ConsistencyCheckPromptTemplate
): Promise<SemanticIssue[]> {
  try {
    const worldContext = buildWorldContextForPrompt(project);
    const factionData = formatFactionForCheck(faction);
    
    const prompt = ConsistencyCheckPromptService.applyVariables(template, {
      projectTitle: project.title || '未命名项目',
      worldView: worldContext,
      factionName: faction.name,
      factionData: factionData
    });

    const response = await AIService.call(model, prompt);
    const result = parseAIResponse(response.content);
    
    if (!result?.issues || !Array.isArray(result.issues)) {
      return [];
    }

    return result.issues.map((issue: any, index: number) => ({
      id: `faction-${faction.id}-issue-${index}`,
      type: issue.type || 'logic_inconsistency',
      category: 'faction',
      targetIds: [faction.id],
      targetNames: [faction.name],
      message: issue.message || '发现潜在问题',
      evidence: issue.evidence || [],
      suggestion: issue.suggestion || '请检查势力设定',
      confidence: issue.confidence || 0.5
    }));
  } catch (error) {
    console.error(`检查势力 ${faction.name} 失败:`, error);
    return [];
  }
}

/**
 * 检查单个地点
 */
async function checkLocation(
  location: Location,
  project: Project,
  model: ModelConfig,
  template: ConsistencyCheckPromptTemplate
): Promise<SemanticIssue[]> {
  try {
    const worldContext = buildWorldContextForPrompt(project);
    const locationData = formatLocationForCheck(location);
    
    const prompt = ConsistencyCheckPromptService.applyVariables(template, {
      projectTitle: project.title || '未命名项目',
      worldView: worldContext,
      locationName: location.name,
      locationData: locationData
    });

    const response = await AIService.call(model, prompt);
    const result = parseAIResponse(response.content);
    
    if (!result?.issues || !Array.isArray(result.issues)) {
      return [];
    }

    return result.issues.map((issue: any, index: number) => ({
      id: `loc-${location.id}-issue-${index}`,
      type: issue.type || 'semantic_contradiction',
      category: 'location',
      targetIds: [location.id],
      targetNames: [location.name],
      message: issue.message || '发现潜在问题',
      evidence: issue.evidence || [],
      suggestion: issue.suggestion || '请检查地点设定',
      confidence: issue.confidence || 0.5
    }));
  } catch (error) {
    console.error(`检查地点 ${location.name} 失败:`, error);
    return [];
  }
}

/**
 * 批量执行检查
 */
async function batchCheck<T>(
  items: T[],
  checkFn: (item: T) => Promise<SemanticIssue[]>,
  batchSize: number,
  onProgress?: (completed: number, total: number) => void
): Promise<SemanticIssue[]> {
  const allIssues: SemanticIssue[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkFn));
    
    batchResults.forEach(issues => allIssues.push(...issues));
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
    
    // 添加小延迟避免API限流
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return allIssues;
}

/**
 * 执行AI语义检查
 */
export async function performSemanticCheck(
  project: Project,
  model: ModelConfig,
  templates: Record<string, ConsistencyCheckPromptTemplate>,
  config: SemanticCheckConfig = DEFAULT_CONFIG,
  onProgress?: (completed: number, total: number, currentItem: string) => void
): Promise<SemanticCheckResult> {
  const allIssues: SemanticIssue[] = [];
  let totalItems = 0;
  let completedItems = 0;
  
  // 计算总项目数
  if (config.checkCharacters) totalItems += project.characters?.length || 0;
  if (config.checkFactions) totalItems += project.factions?.length || 0;
  if (config.checkLocations) totalItems += project.locations?.length || 0;
  
  // 检查角色
  if (config.checkCharacters && project.characters?.length) {
    const charTemplate = templates['semantic_character'];
    if (charTemplate) {
      for (const char of project.characters) {
        if (onProgress) {
          onProgress(completedItems, totalItems, `检查角色: ${char.name}`);
        }
        
        const issues = await checkCharacter(char, project, model, charTemplate);
        allIssues.push(...issues);
        completedItems++;
        
        // 延迟避免限流
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  
  // 检查势力
  if (config.checkFactions && project.factions?.length) {
    const factionTemplate = templates['semantic_faction'];
    if (factionTemplate) {
      for (const faction of project.factions) {
        if (onProgress) {
          onProgress(completedItems, totalItems, `检查势力: ${faction.name}`);
        }
        
        const issues = await checkFaction(faction, project, model, factionTemplate);
        allIssues.push(...issues);
        completedItems++;
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  
  // 检查地点
  if (config.checkLocations && project.locations?.length) {
    const locationTemplate = templates['semantic_location'];
    if (locationTemplate) {
      for (const location of project.locations) {
        if (onProgress) {
          onProgress(completedItems, totalItems, `检查地点: ${location.name}`);
        }
        
        const issues = await checkLocation(location, project, model, locationTemplate);
        allIssues.push(...issues);
        completedItems++;
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  
  // 计算统计信息
  const contradictions = allIssues.filter(i => i.type === 'semantic_contradiction').length;
  const inconsistencies = allIssues.filter(i => i.type === 'logic_inconsistency').length;
  const gaps = allIssues.filter(i => i.type === 'narrative_gap').length;
  const avgConfidence = allIssues.length > 0 
    ? allIssues.reduce((sum, i) => sum + i.confidence, 0) / allIssues.length 
    : 0;
  
  return {
    issues: allIssues,
    summary: {
      total: allIssues.length,
      contradictions,
      inconsistencies,
      gaps,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    },
    checkedAt: Date.now()
  };
}

/**
 * 快速语义检查（检查少量关键项目）
 */
export async function performQuickSemanticCheck(
  project: Project,
  model: ModelConfig,
  templates: Record<string, ConsistencyCheckPromptTemplate>
): Promise<SemanticCheckResult> {
  // 只检查前3个角色、前2个势力、前2个地点
  const limitedProject = {
    ...project,
    characters: project.characters?.slice(0, 3),
    factions: project.factions?.slice(0, 2),
    locations: project.locations?.slice(0, 2)
  };
  
  return performSemanticCheck(limitedProject, model, templates, {
    checkCharacters: true,
    checkFactions: true,
    checkLocations: true,
    checkTimeline: false,
    checkCrossReferences: false
  });
}








