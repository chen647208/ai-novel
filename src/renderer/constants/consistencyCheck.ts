/**
 * 一致性检查默认配置
 */

import { ConsistencyCheckConfig, ConsistencyCheckPromptTemplate } from '../types';

/**
 * 默认一致性检查配置
 */
export const DEFAULT_CONSISTENCY_CHECK_CONFIG: ConsistencyCheckConfig = {
  mode: 'rule',
  weights: {
    rule: 0.4,
    ai: 0.3,
    vector: 0.3
  },
  selectedPromptTemplates: {},
  aiConfig: {
    enabled: true,
    temperature: 0.3,
    maxTokens: 2000
  },
  vectorConfig: {
    enabled: true,
    similarityThreshold: 0.85,
    maxResults: 10
  }
};

/**
 * 默认AI语义检查提示词模板
 */
export const DEFAULT_SEMANTIC_PROMPTS: ConsistencyCheckPromptTemplate[] = [
  {
    id: 'default-semantic-character',
    category: 'semantic_character',
    name: '角色描述一致性检查',
    description: '检查角色背景、性格、目标等描述是否存在矛盾',
    isDefault: true,
    applicableModes: ['ai'],
    variables: ['projectTitle', 'worldView', 'characterName', 'characterData'],
    content: `作为世界观一致性检查专家，请检查角色设定的语义一致性。

【项目】{projectTitle}
【世界观】{worldView}

【角色信息】
{characterData}

请检查以下内容：
1. 性格描述是否一致（如"冷酷无情"与"热心助人"矛盾）
2. 背景故事是否自洽（时间线、事件因果关系）
3. 目标与行为是否匹配（如目标是"复仇"但行为是"逃避"）
4. 与其他角色的关系描述是否一致

以JSON格式返回发现的问题：
{
  "issues": [
    {
      "type": "semantic_contradiction",
      "message": "问题描述",
      "evidence": ["矛盾的具体描述"],
      "suggestion": "修复建议",
      "confidence": 0.95
    }
  ]
}

如果没有发现问题，返回 {"issues": []}`
  },
  {
    id: 'default-semantic-faction',
    category: 'semantic_faction',
    name: '势力行为逻辑检查',
    description: '检查势力设定与实际行为是否一致',
    isDefault: true,
    applicableModes: ['ai'],
    variables: ['projectTitle', 'worldView', 'factionName', 'factionData'],
    content: `作为势力设定专家，请分析势力的行为逻辑一致性。

【项目】{projectTitle}
【世界观】{worldView}

【势力信息】
{factionData}

请检查：
1. 势力宣称的理念与实际行为是否一致
2. 势力结构是否能支撑其宣称的规模
3. 势力历史与其当前地位是否匹配
4. 势力间关系描述是否一致（如A说B是盟友，B是否也认可）

以JSON格式返回问题列表。如果没有问题返回 {"issues": []}`
  },
  {
    id: 'default-semantic-location',
    category: 'semantic_location',
    name: '地点描述一致性检查',
    description: '检查地点描述是否存在矛盾',
    isDefault: true,
    applicableModes: ['ai'],
    variables: ['projectTitle', 'worldView', 'locationName', 'locationData'],
    content: `作为世界观地理专家，请检查地点描述的合理性。

【项目】{projectTitle}
【世界观】{worldView}

【地点信息】
{locationData}

请检查：
1. 地理环境描述是否自洽（如"终年积雪"与"热带植物"矛盾）
2. 地点规模与描述是否匹配
3. 地点间距离和关系是否合理
4. 地点历史与当前状态是否一致

以JSON格式返回问题列表。如果没有问题返回 {"issues": []}`
  },
  {
    id: 'default-semantic-timeline',
    category: 'semantic_timeline',
    name: '时间线逻辑检查',
    description: '检查时间线事件的逻辑顺序和因果关系',
    isDefault: true,
    applicableModes: ['ai'],
    variables: ['projectTitle', 'worldView', 'timelineData'],
    content: `作为时间线逻辑专家，请检查事件序列的合理性。

【项目】{projectTitle}
【世界观】{worldView}

【时间线信息】
{timelineData}

请检查：
1. 事件因果关系是否合理（A导致B，则A必须在B之前）
2. 事件时间间隔是否合理
3. 同一时间点的事件是否冲突
4. 角色年龄与事件时间是否匹配

以JSON格式返回问题列表。如果没有问题返回 {"issues": []}`
  },
  {
    id: 'default-semantic-cross',
    category: 'semantic_cross',
    name: '跨引用一致性检查',
    description: '检查不同元素间的引用描述是否一致',
    isDefault: true,
    applicableModes: ['ai'],
    variables: ['projectTitle', 'worldView', 'crossReferenceData'],
    content: `作为跨引用一致性专家，请检查不同元素间的描述是否相互矛盾。

【项目】{projectTitle}
【世界观】{worldView}

【跨引用信息】
{crossReferenceData}

请检查：
1. A对B的描述与B对自己的描述是否一致
2. 双方关系描述是否对等（如A视B为敌人，B是否也视A为敌人）
3. 共享事件的描述在不同视角下是否一致
4. 地点归属描述是否一致

以JSON格式返回问题列表。如果没有问题返回 {"issues": []}`
  }
];

/**
 * 默认向量相似度检测提示词模板
 */
export const DEFAULT_SIMILARITY_PROMPTS: ConsistencyCheckPromptTemplate[] = [
  {
    id: 'default-similarity-analysis',
    category: 'similarity_detection',
    name: '相似度分析判断',
    description: '用于分析相似项目是否真正重复或只是相似',
    isDefault: true,
    applicableModes: ['vector'],
    variables: ['projectTitle', 'itemA', 'itemB', 'similarityScore'],
    content: `发现两个可能相似的世界观元素，请判断是否真正重复或只是相似。

【元素A】
{itemA}

【元素B】
{itemB}

【向量相似度】{similarityScore}

请分析：
1. 这两个元素是否是同一事物的重复定义？
2. 如果是不同的，它们的区别在哪里？
3. 建议是否需要合并或修改以避免混淆？

以JSON格式返回：
{
  "isDuplicate": true/false,
  "difference": "区别说明",
  "suggestion": "处理建议"
}`
  }
];

/**
 * 获取所有默认提示词模板
 */
export function getDefaultConsistencyPrompts(): ConsistencyCheckPromptTemplate[] {
  return [
    ...DEFAULT_SEMANTIC_PROMPTS,
    ...DEFAULT_SIMILARITY_PROMPTS
  ];
}

/**
 * 根据分类获取默认模板
 */
export function getDefaultPromptsByCategory(
  category: ConsistencyCheckPromptTemplate['category']
): ConsistencyCheckPromptTemplate[] {
  return getDefaultConsistencyPrompts().filter(p => p.category === category);
}
