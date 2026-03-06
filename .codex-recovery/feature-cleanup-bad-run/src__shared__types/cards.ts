import type { Character } from './project';
import type { WorldView, Location, Faction, RuleSystem } from './world';
import type { Timeline } from './timeline';

export type AICardCommand = 
  | 'character'  // /角色
  | 'location'   // /地点
  | 'faction'    // /势力
  | 'timeline'   // /时间线
  | 'rule'       // /规则
  | 'event'      // /事件
  | 'magic'      // /魔法体系
  | 'tech'       // /科技水平
  | 'history';   // /历史背景

// 命令解析结果
export interface AICardCommandResult {
  command: AICardCommand;
  rawInput: string;      // 用户原始输入
  description: string;   // 提取的描述文本
}

// 项目上下文（用于构建Prompt）
export interface AIProjectContext {
  title?: string;
  worldView?: WorldView;
  characters?: Character[];
  locations?: Location[];
  factions?: Faction[];
  timeline?: Timeline;
  ruleSystems?: RuleSystem[];
}

// 卡片创建结果
export interface CardCreationResult {
  success: boolean;
  command: AICardCommand;
  data: any;              // 创建的卡片数据
  message: string;        // 用户提示信息
}

// ==================== Phase 5: 可视化扩展 类型定义 ====================

// 图谱类型
