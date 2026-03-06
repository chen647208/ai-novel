export interface WorldView {
  id: string;
  projectId: string;
  /** 魔法体系设定 */
  magicSystem?: MagicSystem;
  /** 科技水平设定 */
  technologyLevel?: TechnologyLevel;
  /** 历史背景设定 */
  history?: WorldHistory;
  createdAt: number;
  updatedAt: number;
}

/**
 * 魔法体系
 */
export interface MagicSystem {
  /** 体系名称（如：灵力体系、魔法体系、斗气体系） */
  name: string;
  /** 体系概述 */
  description: string;
  /** 魔法/能量规则 */
  rules: string[];
  /** 等级/境界划分（可选） */
  levels?: MagicLevel[];
  /** 限制条件（如：魔力消耗、施法材料、副作用） */
  limitations: string;
  /** 施法方式（如：咒语、手势、意念） */
  castingMethod?: string;
}

/**
 * 魔法/修炼等级
 */
export interface MagicLevel {
  /** 等级名称（如：炼气期、魔法师） */
  name: string;
  /** 等级描述 */
  description: string;
  /** 晋升条件 */
  requirements?: string;
  /** 等级能力 */
  abilities?: string;
  /** 排序索引（用于显示顺序） */
  order: number;
}

/**
 * 科技水平
 */
export interface TechnologyLevel {
  /** 时代名称（如：蒸汽时代、赛博朋克、星际时代） */
  era: string;
  /** 科技水平描述 */
  description: string;
  /** 关键技术列表 */
  keyTechnologies: string[];
  /** 技术限制（如：无法突破光速、能源枯竭） */
  limitations: string;
  /** 能源类型（如：蒸汽、核能、灵石） */
  energySource?: string;
  /** 交通方式 */
  transportation?: string;
  /** 通讯方式 */
  communication?: string;
}

/**
 * 世界历史
 */
export interface WorldHistory {
  /** 历史概述 */
  overview: string;
  /** 历法系统（如：公元、纪元、XX历） */
  calendarSystem?: string;
  /** 关键历史事件 */
  keyEvents: HistoryEvent[];
}

/**
 * 历史事件
 */
export interface HistoryEvent {
  id: string;
  /** 事件日期（支持各种历法格式，如"第三纪元45年春季"） */
  date: HistoryDate;
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 事件影响（对当前故事的影响） */
  impact?: string;
  /** 关联角色ID列表 */
  relatedCharacterIds?: string[];
  /** 关联储备ID列表 */
  relatedLocationIds?: string[];
}

/**
 * 历史日期 - 支持灵活的时间表示
 */
export interface HistoryDate {
  /** 年（相对于历法起点） */
  year: number;
  /** 月（可选） */
  month?: number;
  /** 日（可选） */
  day?: number;
  /** 显示格式（如"第三纪元春季"） */
  display?: string;
  /** 是否是虚构历法 */
  isFictional?: boolean;
}

// ========== Phase 3: 时间线 ==========

/**
 * 时间线
 */

export interface Location {
  id: string;
  projectId: string;
  /** 地点名称 */
  name: string;
  /** 地点类型 */
  type: 'city' | 'region' | 'building' | 'landmark' | 'dungeon' | 'wilderness' | 'other';
  /** 地点描述 */
  description: string;
  /** 地理属性 */
  geography?: {
    /** 地形（如：平原、山脉、森林、沙漠） */
    terrain: string;
    /** 气候 */
    climate: string;
    /** 资源 */
    resources?: string[];
  };
  /** 地点特征标签 */
  tags?: string[];
  /** 势力控制 */
  controlledBy?: string; // Faction.id
  /** 关联地点（地理连接） */
  connectedLocations?: Array<{
    locationId: string;
    relation: 'adjacent' | 'trade' | 'conflict' | 'ally' | 'subordinate';
    description?: string;
  }>;
  /** 地图位置（用于可视化） */
  mapPosition?: {
    x: number;
    y: number;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * 势力/派系
 */
export interface Faction {
  id: string;
  projectId: string;
  /** 势力名称 */
  name: string;
  /** 势力类型 */
  type: 'kingdom' | 'empire' | 'sect' | 'guild' | 'family' | 'tribe' | 'organization' | 'alliance' | 'other';
  /** 势力描述 */
  description: string;
  /** 理念/信仰 */
  ideology?: string;
  /** 实力评估 */
  strength?: {
    military?: string;    // 军事实力
    economic?: string;    // 经济实力
    influence?: string;   // 影响力
    overall: string;      // 综合评估
  };
  /** 标志/旗帜描述 */
  emblem?: string;
  /** 势力关系网 */
  relations?: Array<{
    factionId: string;
    type: 'ally' | 'enemy' | 'neutral' | 'vassal' | 'suzerain' | 'rival' | 'trade';
    description?: string;
  }>;
  /** 控制地点ID列表 */
  controlledLocationIds?: string[]; // Location.id[]
  /** 成员角色ID列表 */
  memberCharacterIds?: string[]; // Character.id[]
  /** 势力领袖 */
  leaderId?: string; // Character.id
  /** 创立时间 */
  foundedDate?: string;
  createdAt: number;
  updatedAt: number;
  
  // ===== 强化关联字段（Phase 1 Integration）=====
  /** 总部地点ID */
  headquartersLocationId?: string;
  /** 领地/控制地域ID列表 */
  territoryLocationIds?: string[];
}

// ========== Phase 4: 规则系统 ==========

/**
 * 规则系统类型
 */
export type RuleSystemType = 
  | 'cultivation'    // 修炼体系
  | 'magic'          // 魔法等级
  | 'tech'           // 科技等级
  | 'currency'       // 货币体系
  | 'organization'   // 组织制度
  | 'profession'     // 职业体系
  | 'title'          // 称号/爵位
  | 'custom';        // 自定义

/**
 * 规则系统
 */
export interface RuleSystem {
  id: string;
  projectId: string;
  /** 规则类型 */
  type: RuleSystemType;
  /** 系统名称 */
  name: string;
  /** 系统描述 */
  description: string;
  /** 等级/层次定义 */
  levels: RuleLevel[];
  /** 适用角色ID列表 */
  appliedToCharacterIds?: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 规则等级
 */
export interface RuleLevel {
  /** 等级名称 */
  name: string;
  /** 等级描述 */
  description: string;
  /** 等级序号（用于排序） */
  order: number;
  /** 晋升条件 */
  requirements?: string;
  /** 等级能力/特权 */
  abilities?: string;
  /** 等级标识（颜色/图标等） */
  badge?: string;
}

// ========== 项目数据模型 ==========
