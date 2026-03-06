import { AICardCommand, AIProjectContext, Project, CardPromptTemplate } from '../../../types';
import { 
  getDefaultTemplateForCommand, 
  buildCardPrompt as buildPromptFromTemplate,
  getTemplateVariableDescriptions 
} from '../../../services/cardPromptService';

/**
 * AI卡片Prompt构建服务
 * 根据不同的命令类型构建适当的AI Prompt
 * 
 * 此服务现在作为兼容层，实际逻辑已迁移到 cardPromptService
 */
export class AICardPromptService {
  
  /**
   * 根据命令类型构建Prompt
   * @param command 命令类型
   * @param description 用户描述
   * @param projectContext 项目上下文
   * @param customTemplate 可选的自定义模板
   * @returns 构建好的Prompt字符串
   */
  static buildPrompt(
    command: AICardCommand, 
    description: string, 
    projectContext: AIProjectContext,
    customTemplate?: CardPromptTemplate
  ): string {
    // 使用新的 cardPromptService 构建提示词
    return buildPromptFromTemplate(command, description, projectContext, customTemplate);
  }

  /**
   * 构建项目上下文描述
   * @param context 项目上下文
   * @returns 格式化的上下文字符串
   */
  static buildProjectContext(context: AIProjectContext): string {
    const parts = ['当前项目背景：'];
    
    if (context.title) {
      parts.push(`小说标题：${context.title}`);
    }
    if (context.worldView) {
      // 从世界观中提取信息
      const worldViewParts = [];
      if (context.worldView.magicSystem?.name) {
        worldViewParts.push(`魔法体系：${context.worldView.magicSystem.name}`);
      }
      if (context.worldView.technologyLevel?.era) {
        worldViewParts.push(`科技水平：${context.worldView.technologyLevel.era}`);
      }
      const intro = worldViewParts.length > 0 ? worldViewParts.join('；') : '已设置';
      parts.push(`世界观：${intro}`);
    }
    if (context.characters?.length) {
      parts.push(`主要角色：${context.characters.map(c => c.name).join('、')}`);
    }
    if (context.locations?.length) {
      parts.push(`已有地点：${context.locations.map(l => l.name).join('、')}`);
    }
    if (context.factions?.length) {
      parts.push(`已有势力：${context.factions.map(f => f.name).join('、')}`);
    }
    if (context.timeline?.config) {
      parts.push(`历法系统：${context.timeline.config.calendarSystem}`);
    }
    if (context.ruleSystems?.length) {
      parts.push(`已有规则：${context.ruleSystems.map(r => r.name).join('、')}`);
    }
    
    return parts.join('\n') || '新项目，暂无背景信息';
  }

  /**
   * 从 Project 对象提取上下文
   * @param project 项目对象
   * @returns 上下文对象
   */
  static extractContextFromProject(project: Project): AIProjectContext {
    return {
      title: project.title,
      worldView: project.worldView,
      characters: project.characters,
      locations: project.locations,
      factions: project.factions,
      timeline: project.timeline,
      ruleSystems: project.ruleSystems,
    };
  }

  /**
   * 获取命令类型的默认模板
   * @param command 命令类型
   * @returns 默认模板
   */
  static getDefaultTemplate(command: AICardCommand): CardPromptTemplate | undefined {
    return getDefaultTemplateForCommand(command);
  }

  /**
   * 获取模板变量说明
   * @returns 变量说明列表
   */
  static getTemplateVariableDescriptions(): Array<{ variable: string; description: string; required: boolean }> {
    return getTemplateVariableDescriptions();
  }

  /**
   * @deprecated 使用 cardPromptService 中的 buildCardPrompt
   * 构建角色创建Prompt
   */
  private static buildCharacterPrompt(description: string, context: string): string {
    return `你是一位专业的小说角色设计师。请根据用户的描述，创建一个完整的角色卡片。

${context}

用户描述：${description}

【重要】你必须严格按照以下要求返回：
1. 只返回JSON数据，不要任何前置说明、后置解释或markdown标记
2. 确保JSON格式完全正确，所有字段都是有效的字符串
3. 不要使用中文标点符号（如：、）作为JSON键值分隔符

请生成一个JSON格式的角色数据，示例：
{
  "name": "李云飞",
  "role": "配角",
  "gender": "男",
  "age": "28岁",
  "personality": "性格描述...",
  "appearance": "外貌描述...",
  "background": "背景故事...",
  "relationships": "关系网...",
  "abilities": "能力描述",
  "weaknesses": "弱点描述",
  "goals": "目标描述",
  "characterArc": "成长弧线"
}

字段说明：
- name: 角色名称（必填）
- role: 角色类型：主角/反派/配角/其他
- gender: 性别：男/女/其他
- age: 年龄描述
- personality: 性格特征
- appearance: 外貌描述
- background: 背景故事
- relationships: 核心关系网
- abilities: 能力/技能（可选）
- weaknesses: 弱点/缺陷（可选）
- goals: 目标和动机（可选）
- characterArc: 角色成长弧线（可选）`;
  }

  /**
   * @deprecated 使用 cardPromptService 中的 buildCardPrompt
   * 构建地点创建Prompt
   */
  private static buildLocationPrompt(description: string, context: string): string {
    return `你是一位专业的小说世界观设计师。请根据用户的描述，创建一个详细的地点卡片。

${context}

用户描述：${description}

请生成一个JSON格式的地点数据，包含以下字段：
{
  "name": "地点名称（简短有力）",
  "type": "地点类型，如：城市、村庄、山脉、森林、遗迹、宗门等",
  "description": "详细描述（200-500字），包含地理环境、气候、建筑特色等",
  "features": "显著特征，如地标建筑、特殊资源、神秘现象等",
  "history": "历史背景（可选）",
  "atmosphere": "氛围描述，如神秘、繁华、荒凉等",
  "significance": "在故事中的重要性"
}

要求：
1. 名称要有辨识度，符合小说世界观
2. 描述要具体生动，有助于AI理解场景
3. 字段内容要与用户描述紧密相关
4. 只返回JSON数据，不要有其他解释文字`;
  }

  /**
   * @deprecated 使用 cardPromptService 中的 buildCardPrompt
   * 构建势力创建Prompt
   */
  private static buildFactionPrompt(description: string, context: string): string {
    return `你是一位专业的小说世界观设计师。请根据用户的描述，创建一个详细的势力/组织卡片。

${context}

用户描述：${description}

请生成一个JSON格式的势力数据，包含以下字段：
{
  "name": "势力名称",
  "type": "势力类型，如：宗门、帝国、商会、秘密组织、世家等",
  "description": "详细描述（200-500字），包含成立背景、发展历程等",
  "goals": "主要目标和宗旨",
  "values": "核心价值观或信条",
  "structure": "组织架构描述",
  "resources": "掌握的资源，如财富、武力、情报等",
  "notableMembers": ["重要成员1", "重要成员2"],
  "headquarters": "总部位置描述（可选）",
  "publicImage": "对外形象，如正义、神秘、恐怖等"
}

要求：
1. 名称要有辨识度
2. 目标和价值观要清晰
3. 描述要有助于AI理解该势力的行为逻辑
4. 只返回JSON数据，不要有其他解释文字`;
  }

  /**
   * @deprecated 使用 cardPromptService 中的 buildCardPrompt
   * 构建时间线事件创建Prompt
   */
  private static buildTimelinePrompt(description: string, context: string): string {
    return `你是一位专业的小说时间线设计师。请根据用户的描述，创建一个时间线事件。

${context}

用户描述：${description}

请生成一个JSON格式的时间事件数据，包含以下字段：
{
  "title": "事件标题（简短）",
  "description": "事件详细描述（200-400字）",
  "date": {
    "year": "年份数字（根据上下文推断合理年份）",
    "month": "月份数字（可选，1-12）",
    "day": "日期数字（可选，1-31）",
    "display": "显示格式，如'第三纪元春季'、'天启元年'等"
  },
  "type": "事件类型：plot(剧情) | character(角色) | world(世界) | faction(势力)",
  "impact": "事件影响范围描述",
  "relatedCharacters": ["相关角色名称1", "相关角色名称2"],
  "relatedLocations": ["相关地点名称1"]
}

要求：
1. 标题简洁有力
2. 日期要与故事时间线契合
3. 描述要突出事件的重要性和影响
4. 只返回JSON数据，不要有其他解释文字`;
  }

  /**
   * @deprecated 使用 cardPromptService 中的 buildCardPrompt
   * 构建规则系统创建Prompt
   */
  private static buildRulePrompt(description: string, context: string): string {
    return `你是一位专业的规则体系设计师。请根据用户的描述，创建一个规则/等级系统。

${context}

用户描述：${description}

请生成一个JSON格式的规则系统数据，包含以下字段：
{
  "name": "系统名称，如'修真境界'、'魔法等级'、'货币体系'等",
  "type": "系统类型：culture | magic_level | tech_tree | currency | organization | custom",
  "description": "系统概述（200-400字），包含基本原理、运作方式等",
  "levels": [
    {
      "name": "等级名称",
      "description": "该等级描述",
      "requirements": "晋升条件",
      "benefits": "该等级带来的能力或权益",
      "order": 1
    }
  ],
  "mechanics": "核心机制说明",
  "limitations": "限制条件或副作用",
  "relatedResources": "相关资源，如灵气、魔晶、金币等"
}

要求：
1. 等级划分要清晰合理
2. 每个等级的能力要递增
3. 晋升条件要有挑战性
4. 只返回JSON数据，不要有其他解释文字`;
  }

  /**
   * @deprecated 使用 cardPromptService 中的 buildCardPrompt
   * 构建剧情事件创建Prompt
   */
  private static buildEventPrompt(description: string, context: string): string {
    return `你是一位专业的小说剧情设计师。请根据用户的描述，创建一个剧情事件。

${context}

用户描述：${description}

请生成一个JSON格式的事件数据，结构与时间线事件相同，但更侧重剧情性：
{
  "title": "事件标题",
  "description": "详细剧情描述（300-600字），包含起因、经过、高潮",
  "type": "plot",
  "participants": ["参与者1", "参与者2"],
  "consequences": ["后果1", "后果2"],
  "emotionalImpact": "情感冲击描述",
  "storySignificance": "对整体故事的影响"
}

要求：
1. 剧情要有张力
2. 明确事件的因果关系
3. 突出对角色和故事的影响
4. 只返回JSON数据，不要有其他解释文字`;
  }

  /**
   * @deprecated 使用 cardPromptService 中的 buildCardPrompt
   * 构建魔法体系创建Prompt
   */
  private static buildMagicPrompt(description: string, context: string): string {
    return `你是一位专业的小说魔法体系设计师。请根据用户的描述，创建一个完整的魔法/修炼体系设定。

${context}

用户描述：${description}

【重要】你必须严格按照以下要求返回：
1. 只返回JSON数据，不要任何前置说明、后置解释或markdown标记
2. 确保JSON格式完全正确
3. rules字段是字符串数组，每个元素是一条规则描述

请生成一个JSON格式的魔法体系数据，示例：
{
  "name": "灵力体系",
  "description": "修士通过吸收天地灵气来增强自身的修炼体系...",
  "rules": [
    "灵气分为金木水火土五种属性",
    "修炼者需要根据自身属性选择合适的功法",
    "突破时需要度过天劫"
  ],
  "limitations": "灵力耗尽后需要时间恢复，禁忌在灵气稀薄之地修炼",
  "castingMethod": "冥想引导灵气入体，结印驱使"
}

字段说明：
- name: 体系名称（必填），如"灵力体系"、"魔法体系"、"斗气体系"等
- description: 体系概述（必填），包含基本原理和特点
- rules: 体系规则（必填），字符串数组，每项是一条规则
- limitations: 限制条件（可选），如能量消耗、施法材料、禁忌等
- castingMethod: 施法方式（可选），如咒语、手势、意念等`;
  }

  /**
   * @deprecated 使用 cardPromptService 中的 buildCardPrompt
   * 构建科技水平创建Prompt
   */
  private static buildTechPrompt(description: string, context: string): string {
    return `你是一位专业的科幻小说科技设定师。请根据用户的描述，创建一个完整的科技水平/时代背景设定。

${context}

用户描述：${description}

【重要】你必须严格按照以下要求返回：
1. 只返回JSON数据，不要任何前置说明、后置解释或markdown标记
2. 确保JSON格式完全正确
3. keyTechnologies字段是字符串数组

请生成一个JSON格式的科技水平数据，示例：
{
  "era": "赛博朋克时代",
  "description": "一个高度发达的科技文明，人类已经掌握了先进的生物科技和人工智能...",
  "keyTechnologies": [
    "人工智能与机械义肢",
    "生物强化技术",
    "量子通讯",
    "反重力飞行"
  ],
  "limitations": "能源危机导致科技发展受限，AI侵入人类生活的伦理争议"
}

字段说明：
- era: 时代名称（必填），如"蒸汽时代"、"赛博朋克时代"、"星际时代"等
- description: 科技水平描述（必填），包含主要特征和社会影响
- keyTechnologies: 关键技术列表（必填），字符串数组
- limitations: 科技限制/障碍（可选），如能源、伦理、资源等方面的限制`;
  }

  /**
   * @deprecated 使用 cardPromptService 中的 buildCardPrompt
   * 构建历史背景创建Prompt
   */
  private static buildHistoryPrompt(description: string, context: string): string {
    return `你是一位专业的小说历史学家和世界观设计师。请根据用户的描述，创建一个完整的历史背景设定。

${context}

用户描述：${description}

【重要】你必须严格按照以下要求返回：
1. 只返回JSON数据，不要任何前置说明、后置解释或markdown标记
2. 确保JSON格式完全正确
3. keyEvents字段是数组，每个元素包含date、title、description和impact

请生成一个JSON格式的历史背景数据，示例：
{
  "overview": "这是一个元素魔法与科学并存的世界，经历了三次魔法大战后，人类开始寻求魔法与科技的融合...",
  "keyEvents": [
    {
      "date": "第一纪元年",
      "title": "元素觉醒",
      "description": "人类首次发现并掌握了元素力量的使用方法",
      "impact": "开启了魔法时代，社会结构发生巨变"
    },
    {
      "date": "第三纪元50年",
      "title": "魔法大战",
      "description": "光明与黑暗两大阵营展开了长达十年的战争",
      "impact": "导致旧王国瓦解，新国家崛起"
    }
  ]
}

字段说明：
- overview: 历史概述（必填），整体历史背景和发展脉络
- keyEvents: 关键事件列表（必填），每个事件包含：
  - date: 事件日期/时间点
  - title: 事件标题
  - description: 事件描述
  - impact: 对后世的影响`;
  }
}

