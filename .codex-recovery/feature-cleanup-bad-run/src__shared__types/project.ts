import type { AIHistoryRecord, ModelConfig, EmbeddingModelConfig } from './ai';
import type {
  KnowledgeItem,
  PromptTemplate,
  CardPromptTemplate,
  ConsistencyCheckPromptTemplate,
  ConsistencyCheckConfig,
} from './knowledge';
import type { HistoryDate, WorldView, Location, Faction, RuleSystem } from './world';
import type { CharacterBirthInfo, Timeline } from './timeline';

export interface Character {
  id: string;
  name: string;
  gender: string;          // 新增：性别
  age: string;
  role: string; // 角色类型（主角、反派、配角等）
  personality: string;
  background: string;
  relationships: string;
  
  // 新增字段
  appearance: string;      // 外观描述：身高、体型、发色、眼睛颜色等
  distinctiveFeatures: string; // 标志性特征：特别的标记或饰品
  occupation: string;      // 职业/身份
  motivation: string;      // 动机/目标
  strengths: string;       // 优势/能力
  weaknesses: string;      // 弱点/缺陷
  characterArc: string;    // 角色成长弧线
  
  // Phase 3: 出生信息（用于年龄计算）
  birthInfo?: CharacterBirthInfo;
  
  // ===== 世界观关联字段（Phase 1 Integration）=====
  /** 所属势力ID */
  factionId?: string;
  /** 出身地点ID */
  homeLocationId?: string;
  /** 当前所在地点ID */
  currentLocationId?: string;
  /** 等级体系中的位置 */
  ruleSystemLevel?: {
    /** 规则系统ID */
    systemId: string;
    /** 等级名称 */
    levelName: string;
  };
  /** 出生日期（用于年龄计算） */
  birthDate?: HistoryDate;
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  content: string;
  contentSummary?: string; // 章节正文摘要（从正文中提取）
  order: number;
  history?: AIHistoryRecord[]; // AI生成历史记录
  
  // ===== 世界观关联字段（Phase 1 Integration）=====
  /** 主要发生地点ID */
  mainLocationId?: string;
  /** 涉及势力ID列表 */
  involvedFactionIds?: string[];
  /** 关联时间线事件ID */
  timelineEventId?: string;
  /** 故事内时间点 */
  storyDate?: HistoryDate;
}

export interface Project {
  id: string;
  title: string;
  inspiration: string;
  intro: string;
  characters: Character[];
  outline: string;
  chapters: Chapter[];
  virtualChapters: Chapter[]; // 新增：独立的虚拟章节存储
  knowledge: KnowledgeItem[]; // 知识库字段
  lastModified: number;
  // ===== Phase 1: 世界观设定（可选） =====
  worldView?: WorldView;
  // ===== Phase 2: 地理信息与势力（可选） =====
  locations?: Location[];
  factions?: Faction[];
  // ===== Phase 3: 时间线（可选） =====
  timeline?: Timeline;
  // ===== Phase 4: 规则系统（可选） =====
  ruleSystems?: RuleSystem[];
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  models: ModelConfig[];
  prompts: PromptTemplate[];
  activeModelId: string | null;
  // Embedding模型配置
  embeddingModels: EmbeddingModelConfig[];
  activeEmbeddingModelId: string | null;
  // AI卡片提示词模板
  cardPrompts?: CardPromptTemplate[];
  // 一致性检查提示词模板
  consistencyPrompts?: ConsistencyCheckPromptTemplate[];
  // 一致性检查配置
  consistencyCheckConfig?: ConsistencyCheckConfig;
}

// 向量数据库相关类型
