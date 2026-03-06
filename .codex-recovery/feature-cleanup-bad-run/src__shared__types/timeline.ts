import type { HistoryDate } from './world';

export interface Timeline {
  id: string;
  projectId: string;
  /** 时间线配置 */
  config: {
    /** 历法系统（如：公元、纪元、XX历） */
    calendarSystem: string;
    /** 起始年份（用于计算） */
    startYear?: number;
    /** 时间线名称 */
    name?: string;
  };
  /** 时间线事件 */
  events: TimelineEvent[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 时间线事件
 */
export interface TimelineEvent {
  id: string;
  /** 事件日期 */
  date: HistoryDate;
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 事件类型 */
  type: 'plot' | 'character' | 'world' | 'faction' | 'battle' | 'discovery' | 'other';
  /** 事件影响 */
  impact?: string;
  /** 关联角色ID列表 */
  relatedCharacterIds?: string[];
  /** 关联地点ID列表 */
  relatedLocationIds?: string[];
  /** 关联势力ID列表 */
  relatedFactionIds?: string[];
  /** 关联章节ID */
  relatedChapterId?: string;
  /** 事件顺序（用于排序） */
  order?: number;
}

/**
 * 角色出生信息（用于年龄计算）
 */
export interface CharacterBirthInfo {
  /** 出生日期 */
  date?: HistoryDate;
  /** 年龄计算方式 */
  calculationType: 'manual' | 'auto';
  /** 手动设置的当前年龄（当calculationType为manual时使用） */
  currentAge?: string;
  /** 当前故事时间点（用于自动计算年龄） */
  storyCurrentDate?: HistoryDate;
}

// ========== Phase 2: 地理信息与势力 ==========

/**
 * 地点/场景
