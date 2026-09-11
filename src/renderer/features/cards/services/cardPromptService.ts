/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * AI卡片提示词管理服务
 * 负责管理AI卡片创建用的提示词模板
 */

import { i18n } from '@/i18n';

import { type AICardCommand, type AIProjectContext,type CardPromptTemplate } from '../../../../shared/types';

/**
 * 获取默认的AI卡片提示词模板
 */
export function getDefaultCardPrompts(): CardPromptTemplate[] {
  return [
    // 角色卡片默认模板
    {
      id: 'card-character-default',
      category: 'card-character',
      name: '默认角色模板',
      nameKey: 'cards:defaultNames.character',
      content: `你是一位专业的小说角色设计师。请根据用户的描述，创建一个**完整的**角色卡片。

【严格字段要求】
你必须返回以下**全部15个字段**，即使某些字段信息不足也**不能省略**，使用空字符串填充：

项目背景：
{context}

用户描述：
{description}

请生成JSON格式数据（**必须包含所有字段**）：
{
  "name": "角色姓名（必填）",
  "gender": "性别枚举：male/female/other/unknown",
  "age": "年龄描述（如'25岁'、'看上去20岁实际300岁'）",
  "role": "角色类型枚举：protagonist/antagonist/supporting/other",
  "personality": "性格特征详细描述（不能为空字符串）",
  "appearance": "外貌描述：身高、体型、发色、眼睛颜色等（不能为空字符串）",
  "background": "背景故事（不能为空字符串）",
  "relationships": "核心关系网（不能为空字符串）",
  "distinctiveFeatures": "标志性特征：特别的标记或饰品（不能为空字符串）",
  "occupation": "职业/身份（不能为空字符串）",
  "motivation": "动机/目标（不能为空字符串）",
  "strengths": "优势/能力（不能为空字符串）",
  "weaknesses": "弱点/缺陷（不能为空字符串）",
  "characterArc": "角色成长弧线（不能为空字符串）"
}

【严格要求】
1. **必须返回上述15个字段**，一个都不能少
2. 如果某个字段无法确定，使用空字符串""填充，但不能省略该字段
3. 名称要有辨识度，符合小说世界观
4. 描述要具体生动，有助于AI理解角色
5. 只返回JSON数据，不要有其他解释文字`,
      variables: ['description', 'context', 'projectTitle', 'worldView'],
      isDefault: true,
      requiredFields: [
        'name', 'gender', 'age', 'role', 'personality', 
        'appearance', 'background', 'relationships',
        'distinctiveFeatures', 'occupation', 'motivation', 
        'strengths', 'weaknesses', 'characterArc'
      ],
      fieldDescriptions: {
        name: '角色姓名（必填）',
        gender: '性别枚举：male/female/other/unknown',
        age: '年龄描述',
        role: '角色类型枚举：protagonist/antagonist/supporting/other',
        personality: '性格特征详细描述',
        appearance: '外貌描述：身高、体型、发色等',
        background: '背景故事',
        relationships: '核心关系网',
        distinctiveFeatures: '标志性特征',
        occupation: '职业/身份',
        motivation: '动机/目标',
        strengths: '优势/能力',
        weaknesses: '弱点/缺陷',
        characterArc: '角色成长弧线'
      }
    },

    // 地点卡片默认模板
    {
      id: 'card-location-default',
      category: 'card-location',
      name: '默认地点模板',
      nameKey: 'cards:defaultNames.location',
      content: `你是一位专业的小说世界观设计师。请根据用户的描述，创建一个**完整的**地点卡片。

【严格字段要求】
你必须返回以下**全部字段**，即使某些字段信息不足也**不能省略**：

项目背景：
{context}

用户描述：
{description}

请生成JSON格式数据（**必须包含所有字段**）：
{
  "name": "地点名称（简短有力）",
  "type": "地点类型，必须是以下之一：city/region/building/landmark/dungeon/wilderness/other",
  "description": "详细描述（200-500字），包含地理环境、气候、建筑特色等",
  "geography": {
    "terrain": "地形（如：平原、山脉、森林、沙漠）",
    "climate": "气候（如：温带、热带、寒带）",
    "resources": ["资源1", "资源2"]
  },
  "tags": ["标签1", "标签2"],
  "features": "显著特征描述"
}

【严格要求】
1. **必须返回所有字段**，包括 geography 对象及其子字段
2. geography 字段必须包含 terrain、climate、resources（数组）
3. 如果信息不足，使用空字符串或空数组填充，但不能省略字段
4. 名称要有辨识度，符合小说世界观
5. 只返回JSON数据，不要有其他解释文字`,
      variables: ['description', 'context', 'projectTitle', 'worldView'],
      isDefault: true,
      requiredFields: ['name', 'type', 'description', 'geography', 'tags'],
      fieldDescriptions: {
        name: '地点名称（简短有力）',
        type: '地点类型：city/region/building/landmark/dungeon/wilderness/other',
        description: '详细描述（200-500字）',
        geography: '地理信息对象，包含terrain、climate、resources',
        tags: '地点特征标签数组'
      }
    },

    // 势力卡片默认模板
    {
      id: 'card-faction-default',
      category: 'card-faction',
      name: '默认势力模板',
      nameKey: 'cards:defaultNames.faction',
      content: `你是一位专业的小说世界观设计师。请根据用户的描述，创建一个**完整的**势力/组织卡片。

【严格字段要求】
你必须返回以下**全部字段**，即使某些字段信息不足也**不能省略**：

项目背景：
{context}

用户描述：
{description}

请生成JSON格式数据（**必须包含所有字段**）：
{
  "name": "势力名称",
  "type": "势力类型：kingdom/empire/sect/guild/family/tribe/organization/alliance/other",
  "description": "详细描述（200-500字），包含成立背景、发展历程等",
  "ideology": "理念/信仰/核心价值观（不能为空字符串）",
  "strength": {
    "military": "军事实力描述（可选，但字段必须存在）",
    "economic": "经济实力描述（可选，但字段必须存在）",
    "influence": "影响力描述（可选，但字段必须存在）",
    "overall": "综合评估（不能为空字符串）"
  },
  "emblem": "标志/旗帜描述（不能为空字符串）",
  "goals": "主要目标（不能为空字符串）",
  "structure": "组织架构描述（不能为空字符串）"
}

【严格要求】
1. **必须返回所有字段**，包括 strength 对象及其所有子字段
2. strength 字段必须包含 military、economic、influence、overall
3. 如果信息不足，使用空字符串填充，但不能省略字段
4. 名称要有辨识度，目标和价值观要清晰
5. 只返回JSON数据，不要有其他解释文字`,
      variables: ['description', 'context', 'projectTitle', 'worldView'],
      isDefault: true,
      requiredFields: ['name', 'type', 'description', 'ideology', 'strength', 'emblem', 'goals', 'structure'],
      fieldDescriptions: {
        name: '势力名称',
        type: '势力类型：kingdom/empire/sect/guild/family/tribe/organization/alliance/other',
        description: '详细描述（200-500字）',
        ideology: '理念/信仰/核心价值观',
        strength: '实力评估对象，包含military、economic、influence、overall',
        emblem: '标志/旗帜描述',
        goals: '主要目标',
        structure: '组织架构描述'
      }
    },

    // 时间线事件默认模板
    {
      id: 'card-timeline-default',
      category: 'card-timeline',
      name: '默认时间线事件模板',
      nameKey: 'cards:defaultNames.timeline',
      content: `你是一位专业的小说时间线设计师。请根据用户的描述，创建一个**完整的**时间线事件。

【严格字段要求】
你必须返回以下**全部字段**，即使某些字段信息不足也**不能省略**：

项目背景：
{context}

用户描述：
{description}

请生成JSON格式数据（**必须包含所有字段**）：
{
  "title": "事件标题（简短）",
  "description": "事件详细描述（200-400字）",
  "date": {
    "year": "年份数字（根据上下文推断合理年份）",
    "month": "月份数字（可选，1-12）",
    "day": "日期数字（可选，1-31）",
    "display": "显示格式，如'第三纪元春季'、'天启元年'等"
  },
  "type": "事件类型：plot(剧情) | character(角色) | world(世界) | faction(势力) | battle(战斗) | discovery(发现) | other(其他)",
  "impact": "事件影响范围描述（不能为空字符串）",
  "relatedCharacters": ["相关角色名称1", "相关角色名称2"],
  "relatedLocations": ["相关地点名称1"]
}

【严格要求】
1. **必须返回所有字段**，包括 date 对象及其子字段
2. date 字段必须包含 year，其他可选但字段必须存在
3. relatedCharacters 和 relatedLocations 必须是字符串数组
4. 如果信息不足，使用空字符串或空数组填充，但不能省略字段
5. 标题简洁有力，日期要与故事时间线契合
6. 只返回JSON数据，不要有其他解释文字`,
      variables: ['description', 'context', 'projectTitle', 'worldView', 'calendarSystem'],
      isDefault: true,
      requiredFields: ['title', 'description', 'date', 'type', 'impact', 'relatedCharacters', 'relatedLocations'],
      fieldDescriptions: {
        title: '事件标题（简短）',
        description: '事件详细描述（200-400字）',
        date: '事件日期对象，包含year、month、day、display',
        type: '事件类型：plot/character/world/faction/battle/discovery/other',
        impact: '事件影响范围描述',
        relatedCharacters: '相关角色名称数组',
        relatedLocations: '相关地点名称数组'
      }
    },

    // 规则系统默认模板
    {
      id: 'card-rule-default',
      category: 'card-rule',
      name: '默认规则系统模板',
      nameKey: 'cards:defaultNames.rule',
      content: `你是一位专业的规则体系设计师。请根据用户的描述，创建一个**完整的**规则/等级系统。

【严格字段要求】
你必须返回以下**全部字段**，即使某些字段信息不足也**不能省略**：

项目背景：
{context}

用户描述：
{description}

请生成JSON格式数据（**必须包含所有字段**）：
{
  "name": "系统名称，如'修真境界'、'魔法等级'、'货币体系'等",
  "type": "系统类型：cultivation(修炼) | magic(魔法) | tech(科技) | currency(货币) | organization(组织) | profession(职业) | title(称号) | custom(自定义)",
  "description": "系统概述（200-400字），包含基本原理、运作方式等",
  "levels": [
    {
      "name": "等级名称",
      "description": "该等级描述",
      "requirements": "晋升条件（可选，但字段必须存在）",
      "abilities": "该等级带来的能力或权益（可选，但字段必须存在）",
      "order": 1
    }
  ],
  "mechanics": "核心机制说明（不能为空字符串）",
  "limitations": "限制条件或副作用（不能为空字符串）",
  "relatedResources": "相关资源，如灵气、魔晶、金币等（不能为空字符串）"
}

【严格要求】
1. **必须返回所有字段**，包括 levels 数组及其所有子字段
2. 每个 level 对象必须包含 name、description、requirements、abilities、order
3. levels 数组至少包含3个等级
4. 等级划分要清晰合理，每个等级的能力要递增
5. 如果信息不足，使用空字符串填充，但不能省略字段
6. 只返回JSON数据，不要有其他解释文字`,
      variables: ['description', 'context', 'projectTitle', 'worldView'],
      isDefault: true,
      requiredFields: ['name', 'type', 'description', 'levels', 'mechanics', 'limitations', 'relatedResources'],
      fieldDescriptions: {
        name: '系统名称',
        type: '系统类型：cultivation/magic/tech/currency/organization/profession/title/custom',
        description: '系统概述（200-400字）',
        levels: '等级数组，每个包含name、description、requirements、abilities、order',
        mechanics: '核心机制说明',
        limitations: '限制条件或副作用',
        relatedResources: '相关资源'
      }
    },

    // 魔法体系默认模板
    {
      id: 'card-magic-default',
      category: 'card-magic',
      name: '默认魔法体系模板',
      nameKey: 'cards:defaultNames.magic',
      content: `你是一位专业的小说魔法体系设计师。请根据用户的描述，创建一个**完整的**魔法/修炼体系设定。

【严格字段要求】
你必须返回以下**全部字段**，即使某些字段信息不足也**不能省略**：

项目背景：
{context}

用户描述：
{description}

请生成JSON格式数据（**必须包含所有字段**）：
{
  "name": "体系名称（必填），如'灵力体系'、'魔法体系'、'斗气体系'等",
  "description": "体系概述（必填），包含基本原理和特点",
  "rules": [
    "规则1：如'灵气分为金木水火土五种属性'",
    "规则2：如'修炼者需要根据自身属性选择合适的功法'",
    "规则3：如'突破时需要度过天劫'"
  ],
  "limitations": "限制条件（可选，但字段必须存在），如能量消耗、施法材料、禁忌等",
  "castingMethod": "施法方式（可选，但字段必须存在），如咒语、手势、意念等",
  "levels": [
    {
      "name": "等级名称",
      "description": "等级描述",
      "requirements": "晋升条件",
      "abilities": "等级能力",
      "order": 1
    }
  ]
}

【严格要求】
1. **必须返回所有字段**，包括 rules 数组和 levels 数组
2. rules 字段是字符串数组，至少包含3条规则
3. levels 数组至少包含3个等级，每个等级包含所有子字段
4. 如果信息不足，使用空字符串或空数组填充，但不能省略字段
5. 体系要有内在逻辑一致性
6. 只返回JSON数据，不要有其他解释文字`,
      variables: ['description', 'context', 'projectTitle', 'worldView'],
      isDefault: true,
      requiredFields: ['name', 'description', 'rules', 'limitations', 'castingMethod', 'levels'],
      fieldDescriptions: {
        name: '体系名称',
        description: '体系概述',
        rules: '体系规则字符串数组',
        limitations: '限制条件',
        castingMethod: '施法方式',
        levels: '等级数组'
      }
    },

    // 科技水平默认模板
    {
      id: 'card-tech-default',
      category: 'card-tech',
      name: '默认科技水平模板',
      nameKey: 'cards:defaultNames.tech',
      content: `你是一位专业的科幻小说科技设定师。请根据用户的描述，创建一个**完整的**科技水平/时代背景设定。

【严格字段要求】
你必须返回以下**全部字段**，即使某些字段信息不足也**不能省略**：

项目背景：
{context}

用户描述：
{description}

请生成JSON格式数据（**必须包含所有字段**）：
{
  "era": "时代名称（必填），如'蒸汽时代'、'赛博朋克时代'、'星际时代'等",
  "description": "科技水平描述（必填），包含主要特征和社会影响",
  "keyTechnologies": [
    "关键技术1",
    "关键技术2",
    "关键技术3"
  ],
  "limitations": "科技限制/障碍（可选，但字段必须存在），如能源、伦理、资源等",
  "energySource": "能源类型（可选，但字段必须存在），如蒸汽、核能、灵石等",
  "transportation": "交通方式（可选，但字段必须存在）",
  "communication": "通讯方式（可选，但字段必须存在）"
}

【严格要求】
1. **必须返回所有字段**
2. keyTechnologies 是字符串数组，至少包含3项技术
3. 时代特征要鲜明，技术水平要统一
4. 如果信息不足，使用空字符串或空数组填充，但不能省略字段
5. 只返回JSON数据，不要有其他解释文字`,
      variables: ['description', 'context', 'projectTitle', 'worldView'],
      isDefault: true,
      requiredFields: ['era', 'description', 'keyTechnologies', 'limitations', 'energySource', 'transportation', 'communication'],
      fieldDescriptions: {
        era: '时代名称',
        description: '科技水平描述',
        keyTechnologies: '关键技术字符串数组',
        limitations: '科技限制/障碍',
        energySource: '能源类型',
        transportation: '交通方式',
        communication: '通讯方式'
      }
    },

    // 历史背景默认模板
    {
      id: 'card-history-default',
      category: 'card-history',
      name: '默认历史背景模板',
      nameKey: 'cards:defaultNames.history',
      content: `你是一位专业的小说历史学家和世界观设计师。请根据用户的描述，创建一个**完整的**历史背景设定。

【严格字段要求】
你必须返回以下**全部字段**，即使某些字段信息不足也**不能省略**：

项目背景：
{context}

用户描述：
{description}

请生成JSON格式数据（**必须包含所有字段**）：
{
  "overview": "历史概述（必填），整体历史背景和发展脉络",
  "keyEvents": [
    {
      "date": "事件日期/时间点",
      "title": "事件标题",
      "description": "事件描述",
      "impact": "对后世的影响"
    }
  ]
}

【严格要求】
1. **必须返回所有字段**，包括 keyEvents 数组及其所有子字段
2. keyEvents 数组至少包含3个关键事件
3. 每个事件必须包含 date、title、description、impact
4. 历史要有逻辑性和连贯性
5. 如果信息不足，使用空字符串填充，但不能省略字段
6. 只返回JSON数据，不要有其他解释文字`,
      variables: ['description', 'context', 'projectTitle', 'worldView', 'calendarSystem'],
      isDefault: true,
      requiredFields: ['overview', 'keyEvents'],
      fieldDescriptions: {
        overview: '历史概述',
        keyEvents: '关键事件数组，每个包含date、title、description、impact'
      }
    }
  ];
}

/**
 * 获取指定命令类型的默认模板
 * @param command 命令类型
 * @returns 默认模板
 */
export function getDefaultTemplateForCommand(command: AICardCommand): CardPromptTemplate | undefined {
  const templates = getDefaultCardPrompts();
  const categoryMap: Record<AICardCommand, string> = {
    'character': 'card-character',
    'location': 'card-location',
    'faction': 'card-faction',
    'timeline': 'card-timeline',
    'rule': 'card-rule',
    'event': 'card-timeline', // 事件使用时间线模板
    'magic': 'card-magic',
    'tech': 'card-tech',
    'history': 'card-history'
  };
  
  return templates.find(t => t.category === categoryMap[command]);
}

/**
 * 构建卡片创建Prompt
 * @param command 命令类型
 * @param description 用户描述
 * @param context 项目上下文
 * @param template 可选的自定义模板
 * @returns 构建好的Prompt字符串
 */
export function buildCardPrompt(
  command: AICardCommand,
  description: string,
  context: AIProjectContext,
  template?: CardPromptTemplate
): string {
  // 使用自定义模板或默认模板
  const promptTemplate = template || getDefaultTemplateForCommand(command);
  
  if (!promptTemplate) {
    throw new Error(i18n.t('cards:prompt.templateMissing', { command }));
  }
  
  let prompt = promptTemplate.content;
  
  // 替换变量
  prompt = prompt.replace(/\{description\}/g, description);
  prompt = prompt.replace(/\{projectTitle\}/g, context.title || '未命名项目');
  prompt = prompt.replace(/\{calendarSystem\}/g, context.timeline?.config?.calendarSystem || '公元');
  
  // 构建世界观上下文
  const worldContext = buildContextString(context);
  prompt = prompt.replace(/\{context\}/g, worldContext);
  prompt = prompt.replace(/\{worldView\}/g, worldContext);
  
  return prompt;
}

/**
 * 构建项目上下文字符串
 * @param context 项目上下文
 * @returns 格式化的上下文字符串
 */
function buildContextString(context: AIProjectContext): string {
  const parts: string[] = [];
  
  if (context.title) {
    parts.push(`小说标题：${context.title}`);
  }
  
  if (context.worldView) {
    if (context.worldView.magicSystem?.name) {
      parts.push(`魔法/修炼体系：${context.worldView.magicSystem.name}`);
      parts.push(`体系概述：${context.worldView.magicSystem.description?.substring(0, 200)}...`);
    }
    if (context.worldView.technologyLevel?.era) {
      parts.push(`科技水平：${context.worldView.technologyLevel.era}`);
      parts.push(`科技概述：${context.worldView.technologyLevel.description?.substring(0, 200)}...`);
    }
    if (context.worldView.history?.calendarSystem) {
      parts.push(`历法系统：${context.worldView.history.calendarSystem}`);
    }
  }
  
  if (context.characters?.length) {
    parts.push(`已有角色：${context.characters.map(c => c.name).join('、')}`);
  }
  
  if (context.locations?.length) {
    parts.push(`已有地点：${context.locations.map(l => l.name).join('、')}`);
  }
  
  if (context.factions?.length) {
    parts.push(`已有势力：${context.factions.map(f => f.name).join('、')}`);
  }
  
  if (context.ruleSystems?.length) {
    parts.push(`已有规则体系：${context.ruleSystems.map(r => r.name).join('、')}`);
  }
  
  return parts.join('\n') || '新项目，暂无背景信息';
}

/**
 * 验证自定义模板是否有效
 * @param template 待验证的模板
 * @returns 验证结果
 */
export function validateCardPromptTemplate(template: Partial<CardPromptTemplate>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.category) {
    errors.push(i18n.t('cards:validate.categoryRequired'));
  }

  if (!template.name || template.name.trim() === '') {
    errors.push(i18n.t('cards:validate.nameRequired'));
  }

  if (!template.content || template.content.trim() === '') {
    errors.push(i18n.t('cards:validate.contentRequired'));
  }

  // 检查是否包含 {description} 变量
  if (template.content && !template.content.includes('{description}')) {
    errors.push(i18n.t('cards:validate.descriptionVariableRequired'));
  }

  // 检查必填字段是否定义
  if (!template.requiredFields || template.requiredFields.length === 0) {
    errors.push(i18n.t('cards:validate.requiredFieldsRequired'));
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 获取模板变量说明
 * @returns 变量说明列表
 */
export function getTemplateVariableDescriptions(): Array<{ variable: string; description: string; required: boolean }> {
  return [
    { variable: '{description}', description: i18n.t('cards:variables.description'), required: true },
    { variable: '{context}', description: i18n.t('cards:variables.context'), required: false },
    { variable: '{projectTitle}', description: i18n.t('cards:variables.projectTitle'), required: false },
    { variable: '{worldView}', description: i18n.t('cards:variables.worldView'), required: false },
    { variable: '{calendarSystem}', description: i18n.t('cards:variables.calendarSystem'), required: false },
    { variable: '{existingCharacters}', description: i18n.t('cards:variables.existingCharacters'), required: false },
    { variable: '{existingLocations}', description: i18n.t('cards:variables.existingLocations'), required: false },
    { variable: '{existingFactions}', description: i18n.t('cards:variables.existingFactions'), required: false },
  ];
}





