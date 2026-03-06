/**
 * AI上下文构建服务
 * 负责构建各类AI生成任务所需的上下文信息
 */

import {
  Project,
  Character,
  Chapter,
  Location,
  Faction,
  Timeline,
  RuleSystem,
  WorldView,
  HistoryDate,
  TimelineEvent
} from '../../../types';

/**
 * 世界上下文摘要
 */
export interface WorldContextSummary {
  /** 项目标题 */
  title: string;
  /** 世界观概述 */
  worldOverview: string;
  /** 魔法/修炼体系 */
  magicSystem?: string;
  /** 科技水平 */
  techLevel?: string;
  /** 历法系统 */
  calendarSystem?: string;
  /** 关键地点列表 */
  keyLocations: string[];
  /** 主要势力列表 */
  keyFactions: string[];
  /** 规则系统列表 */
  ruleSystems: string[];
}

/**
 * 角色上下文
 */
export interface CharacterContext {
  /** 角色基本信息 */
  character: Character;
  /** 所属势力信息 */
  faction?: Faction;
  /** 出身地点信息 */
  homeLocation?: Location;
  /** 当前地点信息 */
  currentLocation?: Location;
  /** 等级体系信息 */
  ruleSystem?: RuleSystem;
  /** 当前等级信息 */
  currentLevel?: string;
  /** 相关角色列表 */
  relatedCharacters: Character[];
}

/**
 * 章节上下文
 */
export interface ChapterContext {
  /** 章节基本信息 */
  chapter: Chapter;
  /** 主要发生地点 */
  mainLocation?: Location;
  /** 涉及势力列表 */
  involvedFactions: Faction[];
  /** 关联时间线事件 */
  timelineEvent?: TimelineEvent;
  /** 前一章节 */
  previousChapter?: Chapter;
  /** 后一章节 */
  nextChapter?: Chapter;
  /** 故事时间点 */
  storyDate?: HistoryDate;
}

/**
 * 构建项目世界观上下文摘要
 * @param project 项目对象
 * @returns 世界上下文摘要
 */
export function buildWorldContext(project: Project): WorldContextSummary {
  const summary: WorldContextSummary = {
    title: project.title,
    worldOverview: buildWorldOverview(project.worldView),
    keyLocations: project.locations?.map(l => l.name) || [],
    keyFactions: project.factions?.map(f => f.name) || [],
    ruleSystems: project.ruleSystems?.map(r => r.name) || []
  };

  // 提取魔法体系信息
  if (project.worldView?.magicSystem) {
    summary.magicSystem = project.worldView.magicSystem.name;
  }

  // 提取科技水平信息
  if (project.worldView?.technologyLevel) {
    summary.techLevel = project.worldView.technologyLevel.era;
  }

  // 提取历法系统
  if (project.timeline?.config?.calendarSystem) {
    summary.calendarSystem = project.timeline.config.calendarSystem;
  }

  return summary;
}

/**
 * 构建世界观概述文本
 * @param worldView 世界观对象
 * @returns 概述文本
 */
function buildWorldOverview(worldView?: WorldView): string {
  if (!worldView) return '暂无世界观设定';

  const parts: string[] = [];

  if (worldView.magicSystem) {
    parts.push(`魔法/修炼体系：${worldView.magicSystem.name}`);
    parts.push(`体系描述：${worldView.magicSystem.description?.substring(0, 100)}...`);
  }

  if (worldView.technologyLevel) {
    parts.push(`科技水平：${worldView.technologyLevel.era}`);
    parts.push(`科技描述：${worldView.technologyLevel.description?.substring(0, 100)}...`);
  }

  if (worldView.history) {
    parts.push(`历史背景：${worldView.history.overview?.substring(0, 100)}...`);
    if (worldView.history.calendarSystem) {
      parts.push(`历法：${worldView.history.calendarSystem}`);
    }
  }

  return parts.join('\n') || '世界观设定已创建但暂无详细描述';
}

/**
 * 构建角色上下文
 * @param character 角色对象
 * @param project 项目对象
 * @returns 角色上下文
 */
export function buildCharacterContext(
  character: Character,
  project: Project
): CharacterContext {
  const context: CharacterContext = {
    character,
    relatedCharacters: []
  };

  // 查找所属势力
  if (character.factionId && project.factions) {
    context.faction = project.factions.find(f => f.id === character.factionId);
  }

  // 查找出身地点
  if (character.homeLocationId && project.locations) {
    context.homeLocation = project.locations.find(l => l.id === character.homeLocationId);
  }

  // 查找当前地点
  if (character.currentLocationId && project.locations) {
    context.currentLocation = project.locations.find(l => l.id === character.currentLocationId);
  }

  // 查找等级体系
  if (character.ruleSystemLevel && project.ruleSystems) {
    context.ruleSystem = project.ruleSystems.find(
      r => r.id === character.ruleSystemLevel?.systemId
    );
    if (context.ruleSystem && character.ruleSystemLevel) {
      const level = context.ruleSystem.levels.find(
        l => l.name === character.ruleSystemLevel?.levelName
      );
      context.currentLevel = level ? `${level.name} (${level.description})` : character.ruleSystemLevel.levelName;
    }
  }

  // 查找相关角色（通过关系字段简单匹配）
  if (project.characters && character.relationships) {
    context.relatedCharacters = project.characters.filter(c => {
      if (c.id === character.id) return false;
      // 简单的名称匹配，实际使用时可能需要更复杂的逻辑
      return character.relationships?.includes(c.name);
    });
  }

  return context;
}

/**
 * 构建章节上下文
 * @param chapter 章节对象
 * @param project 项目对象
 * @returns 章节上下文
 */
export function buildChapterContext(
  chapter: Chapter,
  project: Project
): ChapterContext {
  const context: ChapterContext = {
    chapter,
    involvedFactions: []
  };

  // 查找主要发生地点
  if (chapter.mainLocationId && project.locations) {
    context.mainLocation = project.locations.find(l => l.id === chapter.mainLocationId);
  }

  // 查找涉及势力
  if (chapter.involvedFactionIds && project.factions) {
    context.involvedFactions = project.factions.filter(
      f => chapter.involvedFactionIds?.includes(f.id)
    );
  }

  // 查找关联时间线事件
  if (chapter.timelineEventId && project.timeline?.events) {
    context.timelineEvent = project.timeline.events.find(
      e => e.id === chapter.timelineEventId
    ) as TimelineEvent | undefined;
  }

  // 查找前一章节和后一章节
  if (project.chapters) {
    const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(c => c.id === chapter.id);
    
    if (currentIndex > 0) {
      context.previousChapter = sortedChapters[currentIndex - 1];
    }
    if (currentIndex < sortedChapters.length - 1) {
      context.nextChapter = sortedChapters[currentIndex + 1];
    }
  }

  // 故事时间点
  if (chapter.storyDate) {
    context.storyDate = chapter.storyDate;
  }

  return context;
}

/**
 * 构建用于AI提示词的世界观上下文文本
 * @param project 项目对象
 * @param options 选项
 * @returns 格式化的上下文文本
 */
export function buildWorldContextForPrompt(
  project: Project,
  options?: {
    includeWorldView?: boolean;
    includeLocations?: boolean;
    includeFactions?: boolean;
    includeTimeline?: boolean;
    includeRuleSystems?: boolean;
    maxLocations?: number;
    maxFactions?: number;
  }
): string {
  const opts = {
    includeWorldView: true,
    includeLocations: true,
    includeFactions: true,
    includeTimeline: true,
    includeRuleSystems: true,
    maxLocations: 10,
    maxFactions: 10,
    ...options
  };

  const parts: string[] = [];

  // 标题
  parts.push(`【作品标题】${project.title}`);

  // 世界观设定
  if (opts.includeWorldView && project.worldView) {
    parts.push('\n【世界观设定】');
    if (project.worldView.magicSystem) {
      parts.push(`魔法/修炼体系：${project.worldView.magicSystem.name}`);
      parts.push(`体系概述：${project.worldView.magicSystem.description}`);
      if (project.worldView.magicSystem.rules?.length) {
        parts.push(`核心规则：${project.worldView.magicSystem.rules.join('；')}`);
      }
    }
    if (project.worldView.technologyLevel) {
      parts.push(`科技水平：${project.worldView.technologyLevel.era}`);
      parts.push(`科技概述：${project.worldView.technologyLevel.description}`);
    }
  }

  // 地点信息
  if (opts.includeLocations && project.locations?.length) {
    parts.push('\n【重要地点】');
    project.locations
      .slice(0, opts.maxLocations)
      .forEach(loc => {
        parts.push(`- ${loc.name}（${loc.type}）：${loc.description.substring(0, 100)}...`);
      });
  }

  // 势力信息
  if (opts.includeFactions && project.factions?.length) {
    parts.push('\n【主要势力】');
    project.factions
      .slice(0, opts.maxFactions)
      .forEach(faction => {
        parts.push(`- ${faction.name}（${faction.type}）：${faction.description.substring(0, 100)}...`);
      });
  }

  // 时间线信息
  if (opts.includeTimeline && project.timeline) {
    parts.push('\n【时间线】');
    parts.push(`历法系统：${project.timeline.config.calendarSystem}`);
    if (project.timeline.events?.length) {
      parts.push(`关键事件：${project.timeline.events.slice(0, 5).map(e => e.title).join('、')}`);
    }
  }

  // 规则系统
  if (opts.includeRuleSystems && project.ruleSystems?.length) {
    parts.push('\n【规则体系】');
    project.ruleSystems.forEach(rule => {
      parts.push(`- ${rule.name}（${rule.type}）：${rule.levels.length}个等级`);
    });
  }

  return parts.join('\n');
}

/**
 * 构建用于AI提示词的角色上下文文本
 * @param context 角色上下文
 * @returns 格式化的上下文文本
 */
export function buildCharacterContextForPrompt(context: CharacterContext): string {
  const parts: string[] = [];
  const c = context.character;

  parts.push(`【角色信息】`);
  parts.push(`姓名：${c.name}`);
  parts.push(`性别：${c.gender || '未知'}`);
  parts.push(`年龄：${c.age || '未知'}`);
  parts.push(`角色类型：${c.role || '未知'}`);
  parts.push(`性格：${c.personality || '暂无描述'}`);
  parts.push(`外貌：${c.appearance || '暂无描述'}`);
  parts.push(`背景：${c.background || '暂无描述'}`);

  if (context.faction) {
    parts.push(`\n所属势力：${context.faction.name}（${context.faction.type}）`);
  }

  if (context.homeLocation) {
    parts.push(`出身地点：${context.homeLocation.name}`);
  }

  if (context.currentLocation) {
    parts.push(`当前地点：${context.currentLocation.name}`);
  }

  if (context.currentLevel) {
    parts.push(`当前等级：${context.currentLevel}`);
  }

  if (context.relatedCharacters.length) {
    parts.push(`\n相关角色：${context.relatedCharacters.map(rc => rc.name).join('、')}`);
  }

  return parts.join('\n');
}

/**
 * 构建用于AI提示词的章节上下文文本
 * @param context 章节上下文
 * @returns 格式化的上下文文本
 */
export function buildChapterContextForPrompt(context: ChapterContext): string {
  const parts: string[] = [];
  const ch = context.chapter;

  parts.push(`【章节信息】`);
  parts.push(`标题：${ch.title}`);
  parts.push(`序号：第${ch.order + 1}章`);
  parts.push(`细纲：${ch.summary}`);

  if (context.mainLocation) {
    parts.push(`\n主要发生地点：${context.mainLocation.name}`);
    parts.push(`地点描述：${context.mainLocation.description.substring(0, 200)}...`);
  }

  if (context.involvedFactions.length) {
    parts.push(`\n涉及势力：${context.involvedFactions.map(f => f.name).join('、')}`);
  }

  if (context.previousChapter) {
    parts.push(`\n前一章：${context.previousChapter.title}`);
    parts.push(`前一章概要：${context.previousChapter.summary?.substring(0, 100)}...`);
  }

  if (context.nextChapter) {
    parts.push(`\n后一章：${context.nextChapter.title}`);
    parts.push(`后一章概要：${context.nextChapter.summary?.substring(0, 100)}...`);
  }

  if (context.storyDate) {
    parts.push(`\n故事时间点：${context.storyDate.display || `${context.storyDate.year}年`}`);
  }

  return parts.join('\n');
}

/**
 * 截断文本以适应Token限制
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateContext(text: string, maxLength: number = 4000): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');
  
  if (lastNewline > maxLength * 0.8) {
    return truncated.substring(0, lastNewline) + '\n\n[内容已截断...]';
  }
  
  return truncated + '\n\n[内容已截断...]';
}

