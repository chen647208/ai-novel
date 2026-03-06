/**
 * 向量相似度检测服务
 * 使用Embedding模型发现相似或重复的世界观元素
 */

import { 
  Project, 
  Character, 
  Faction, 
  Location, 
  EmbeddingModelConfig,
  ConsistencyCheckPromptTemplate 
} from '../../../types';
import { vectorIntegrationService } from '../../../services/vectorIntegrationService';
import { AIService } from '../../../services/aiService';
import { ConsistencyCheckPromptService } from '../../../services/consistencyCheckPromptService';

export interface SimilarityIssue {
  id: string;
  type: 'high_similarity' | 'potential_duplicate' | 'description_overlap';
  category: 'character' | 'faction' | 'location';
  targetIds: [string, string];
  targetNames: [string, string];
  similarityScore: number;
  message: string;
  suggestion: string;
  commonKeywords: string[];
  aiAnalysis?: {
    isDuplicate: boolean;
    difference: string;
    confidence: number;
  };
}

export interface VectorCheckResult {
  issues: SimilarityIssue[];
  summary: {
    total: number;
    highSimilarity: number;
    mediumSimilarity: number;
    embeddingsGenerated: number;
    avgSimilarity: number;
  };
  checkedAt: number;
}

export interface VectorCheckConfig {
  threshold: number;
  maxResults: number;
  categories: ('character' | 'faction' | 'location')[];
  useAIAnalysis: boolean;
  aiModel?: import('../../../types').ModelConfig;
  aiTemplate?: ConsistencyCheckPromptTemplate;
}

const DEFAULT_CONFIG: VectorCheckConfig = {
  threshold: 0.85,
  maxResults: 10,
  categories: ['character', 'faction', 'location'],
  useAIAnalysis: false
};

/**
 * 格式化角色为文档文本
 */
function formatCharacterAsDocument(char: Character): string {
  return `
角色: ${char.name}
性别: ${char.gender || '未知'}
年龄: ${char.age || '未知'}
身份: ${char.role || '未知'}
性格: ${char.personality || '未知'}
外貌: ${char.appearance || '未知'}
背景: ${char.background || '无'}
动机: ${char.motivation || '无'}
优势: ${char.strengths || '无'}
弱点: ${char.weaknesses || '无'}
`.trim();
}

/**
 * 格式化势力为文档文本
 */
function formatFactionAsDocument(faction: Faction): string {
  return `
势力: ${faction.name}
类型: ${faction.type}
描述: ${faction.description || '无'}
理念: ${faction.ideology || '无'}
`.trim();
}

/**
 * 格式化地点为文档文本
 */
function formatLocationAsDocument(location: Location): string {
  return `
地点: ${location.name}
类型: ${location.type}
描述: ${location.description || '无'}
地形: ${location.geography?.terrain || '无'}
气候: ${location.geography?.climate || '无'}
`.trim();
}

/**
 * 生成世界观元素的向量嵌入
 */
export async function generateWorldViewEmbeddings(
  project: Project,
  embeddingConfig: EmbeddingModelConfig,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const items: Array<{ id: string; content: string; metadata: any }> = [];
  
  // 收集角色
  project.characters?.forEach(char => {
    items.push({
      id: `char_${char.id}`,
      content: formatCharacterAsDocument(char),
      metadata: {
        type: 'character',
        name: char.name,
        category: 'character',
        originalId: char.id
      }
    });
  });
  
  // 收集势力
  project.factions?.forEach(faction => {
    items.push({
      id: `faction_${faction.id}`,
      content: formatFactionAsDocument(faction),
      metadata: {
        type: 'faction',
        name: faction.name,
        category: 'faction',
        originalId: faction.id
      }
    });
  });
  
  // 收集地点
  project.locations?.forEach(location => {
    items.push({
      id: `loc_${location.id}`,
      content: formatLocationAsDocument(location),
      metadata: {
        type: 'location',
        name: location.name,
        category: 'location',
        originalId: location.id
      }
    });
  });
  
  // 批量生成向量
  let completed = 0;
  for (const item of items) {
    try {
      await vectorIntegrationService.indexKnowledgeBase(
        project.id,
        [{
          id: item.id,
          name: item.metadata.name,
          content: item.content,
          type: 'txt',
          size: item.content.length,
          addedAt: Date.now(),
          category: item.metadata.category
        }]
      );
      
      completed++;
      if (onProgress) {
        onProgress(completed, items.length);
      }
    } catch (error) {
      console.error(`为 ${item.metadata.name} 生成向量失败:`, error);
    }
  }
}

/**
 * 计算文本相似度（基于关键词）
 */
function calculateKeywordSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * 提取共同关键词
 */
function extractCommonKeywords(text1: string, text2: string): string[] {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  return [...words1].filter(w => words2.has(w)).slice(0, 10);
}

/**
 * 使用AI分析相似项
 */
async function analyzeSimilarityWithAI(
  itemA: { name: string; content: string; type: string },
  itemB: { name: string; content: string; type: string },
  similarityScore: number,
  model: import('../../../types').ModelConfig,
  template: ConsistencyCheckPromptTemplate
): Promise<{ isDuplicate: boolean; difference: string; confidence: number }> {
  try {
    const prompt = ConsistencyCheckPromptService.applyVariables(template, {
      projectTitle: '当前项目',
      itemA: `${itemA.name}\n${itemA.content}`,
      itemB: `${itemB.name}\n${itemB.content}`,
      similarityScore: similarityScore.toFixed(2)
    });
    
    const response = await AIService.call(model, prompt);
    
    // 解析JSON响应
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        isDuplicate: result.isDuplicate || false,
        difference: result.difference || '',
        confidence: result.confidence || 0.5
      };
    }
  } catch (error) {
    console.error('AI分析相似度失败:', error);
  }
  
  return { isDuplicate: false, difference: '', confidence: 0 };
}

/**
 * 查找相似项目
 */
async function findSimilarItems(
  projectId: string,
  item: { id: string; content: string; metadata: any },
  threshold: number,
  maxResults: number
): Promise<Array<{ item: any; score: number }>> {
  try {
    // 使用向量搜索
    const results = await vectorIntegrationService.semanticSearchKnowledge(
      projectId,
      item.content,
      { limit: maxResults * 2 } // 获取更多结果用于过滤
    );
    
    // 过滤掉自己并应用阈值
    return results
      .filter(r => r.document.id !== item.id && r.metadata?.category === item.metadata.category)
      .map(r => ({
        item: { id: r.document.id, content: r.content, metadata: r.metadata },
        score: r.score
      }))
      .filter(r => r.score >= threshold)
      .slice(0, maxResults);
  } catch (error) {
    console.error('向量搜索失败:', error);
    return [];
  }
}

/**
 * 执行向量相似度检查
 */
export async function performSimilarityCheck(
  project: Project,
  embeddingConfig: EmbeddingModelConfig,
  config: Partial<VectorCheckConfig> = {},
  onProgress?: (current: number, total: number, stage: string) => void
): Promise<VectorCheckResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const issues: SimilarityIssue[] = [];
  const processedPairs = new Set<string>();
  
  // 阶段1: 生成向量
  if (onProgress) onProgress(0, 100, '正在生成向量嵌入...');
  
  try {
    await generateWorldViewEmbeddings(project, embeddingConfig, (current, total) => {
      if (onProgress) onProgress(Math.round((current / total) * 30), 100, '正在生成向量嵌入...');
    });
  } catch (error) {
    console.error('生成向量失败:', error);
  }
  
  // 阶段2: 相似度检测
  if (onProgress) onProgress(30, 100, '正在检测相似度...');
  
  let totalItems = 0;
  if (finalConfig.categories.includes('character')) totalItems += project.characters?.length || 0;
  if (finalConfig.categories.includes('faction')) totalItems += project.factions?.length || 0;
  if (finalConfig.categories.includes('location')) totalItems += project.locations?.length || 0;
  
  let processedItems = 0;
  
  // 检查角色
  if (finalConfig.categories.includes('character')) {
    for (const char of project.characters || []) {
      const doc = {
        id: `char_${char.id}`,
        content: formatCharacterAsDocument(char),
        metadata: { type: 'character', name: char.name, category: 'character', originalId: char.id }
      };
      
      const similarItems = await findSimilarItems(
        project.id,
        doc,
        finalConfig.threshold,
        finalConfig.maxResults
      );
      
      for (const similar of similarItems) {
        const pairId = [char.id, similar.item.metadata.originalId].sort().join('-');
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);
        
        const otherChar = project.characters?.find(c => c.id === similar.item.metadata.originalId);
        if (!otherChar) continue;
        
        const commonKeywords = extractCommonKeywords(doc.content, similar.item.content);
        
        let aiAnalysis;
        if (finalConfig.useAIAnalysis && finalConfig.aiModel && finalConfig.aiTemplate) {
          aiAnalysis = await analyzeSimilarityWithAI(
            { name: char.name, content: doc.content, type: 'character' },
            { name: otherChar.name, content: similar.item.content, type: 'character' },
            similar.score,
            finalConfig.aiModel,
            finalConfig.aiTemplate
          );
        }
        
        issues.push({
          id: `sim-char-${pairId}`,
          type: similar.score > 0.95 ? 'potential_duplicate' : 'high_similarity',
          category: 'character',
          targetIds: [char.id, otherChar.id],
          targetNames: [char.name, otherChar.name],
          similarityScore: similar.score,
          message: `角色「${char.name}」与「${otherChar.name}」相似度高达 ${(similar.score * 100).toFixed(1)}%`,
          suggestion: aiAnalysis?.isDuplicate 
            ? '建议合并这两个角色或修改其中一个的设定以区分'
            : '建议检查两个角色的描述，确保它们有明显的区别',
          commonKeywords,
          aiAnalysis
        });
      }
      
      processedItems++;
      if (onProgress) {
        onProgress(30 + Math.round((processedItems / totalItems) * 70), 100, '正在检测相似度...');
      }
    }
  }
  
  // 检查势力
  if (finalConfig.categories.includes('faction')) {
    for (const faction of project.factions || []) {
      const doc = {
        id: `faction_${faction.id}`,
        content: formatFactionAsDocument(faction),
        metadata: { type: 'faction', name: faction.name, category: 'faction', originalId: faction.id }
      };
      
      const similarItems = await findSimilarItems(
        project.id,
        doc,
        finalConfig.threshold,
        finalConfig.maxResults
      );
      
      for (const similar of similarItems) {
        const pairId = [faction.id, similar.item.metadata.originalId].sort().join('-');
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);
        
        const otherFaction = project.factions?.find(f => f.id === similar.item.metadata.originalId);
        if (!otherFaction) continue;
        
        const commonKeywords = extractCommonKeywords(doc.content, similar.item.content);
        
        issues.push({
          id: `sim-faction-${pairId}`,
          type: similar.score > 0.95 ? 'potential_duplicate' : 'high_similarity',
          category: 'faction',
          targetIds: [faction.id, otherFaction.id],
          targetNames: [faction.name, otherFaction.name],
          similarityScore: similar.score,
          message: `势力「${faction.name}」与「${otherFaction.name}」相似度高达 ${(similar.score * 100).toFixed(1)}%`,
          suggestion: '建议检查两个势力的描述，确保它们有明显的区别',
          commonKeywords
        });
      }
      
      processedItems++;
      if (onProgress) {
        onProgress(30 + Math.round((processedItems / totalItems) * 70), 100, '正在检测相似度...');
      }
    }
  }
  
  // 检查地点
  if (finalConfig.categories.includes('location')) {
    for (const location of project.locations || []) {
      const doc = {
        id: `loc_${location.id}`,
        content: formatLocationAsDocument(location),
        metadata: { type: 'location', name: location.name, category: 'location', originalId: location.id }
      };
      
      const similarItems = await findSimilarItems(
        project.id,
        doc,
        finalConfig.threshold,
        finalConfig.maxResults
      );
      
      for (const similar of similarItems) {
        const pairId = [location.id, similar.item.metadata.originalId].sort().join('-');
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);
        
        const otherLocation = project.locations?.find(l => l.id === similar.item.metadata.originalId);
        if (!otherLocation) continue;
        
        const commonKeywords = extractCommonKeywords(doc.content, similar.item.content);
        
        issues.push({
          id: `sim-loc-${pairId}`,
          type: similar.score > 0.95 ? 'potential_duplicate' : 'high_similarity',
          category: 'location',
          targetIds: [location.id, otherLocation.id],
          targetNames: [location.name, otherLocation.name],
          similarityScore: similar.score,
          message: `地点「${location.name}」与「${otherLocation.name}」相似度高达 ${(similar.score * 100).toFixed(1)}%`,
          suggestion: '建议检查两个地点的描述，确保它们有明显的区别',
          commonKeywords
        });
      }
      
      processedItems++;
      if (onProgress) {
        onProgress(30 + Math.round((processedItems / totalItems) * 70), 100, '正在检测相似度...');
      }
    }
  }
  
  // 计算统计
  const highSimilarity = issues.filter(i => i.similarityScore > 0.9).length;
  const mediumSimilarity = issues.filter(i => i.similarityScore > 0.8 && i.similarityScore <= 0.9).length;
  const avgSimilarity = issues.length > 0 
    ? issues.reduce((sum, i) => sum + i.similarityScore, 0) / issues.length 
    : 0;
  
  if (onProgress) onProgress(100, 100, '检测完成');
  
  return {
    issues,
    summary: {
      total: issues.length,
      highSimilarity,
      mediumSimilarity,
      embeddingsGenerated: processedPairs.size,
      avgSimilarity: Math.round(avgSimilarity * 100) / 100
    },
    checkedAt: Date.now()
  };
}

/**
 * 快速相似度检查（仅检查关键项目）
 */
export async function performQuickSimilarityCheck(
  project: Project,
  embeddingConfig: EmbeddingModelConfig
): Promise<VectorCheckResult> {
  return performSimilarityCheck(
    project,
    embeddingConfig,
    {
      threshold: 0.9,
      maxResults: 5,
      categories: ['character', 'faction'],
      useAIAnalysis: false
    }
  );
}

