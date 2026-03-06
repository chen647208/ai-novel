import type { Character } from './project';
import type { Faction, Location, RuleSystem } from './world';
import type { TimelineEvent } from './timeline';

export type DiagramType = 
  | 'character'           // 角色关系图
  | 'faction'            // 势力关系图
  | 'location'           // 地点关联图
  | 'timeline'           // 时间线图
  | 'worldview'          // 世界观网络
  | 'mixed';             // 综合视图

// 布局类型
export type GraphLayout = 'force' | 'hierarchical' | 'circular' | 'timeline' | 'map';

// 可视化节点类型
export type GraphNodeType = 'character' | 'faction' | 'location' | 'event' | 'rule' | 'worldview';

// 可视化配置
export interface VisualizationConfig {
  type: DiagramType;
  layout?: GraphLayout;
  filters?: {
    showCharacters?: boolean;
    showFactions?: boolean;
    showLocations?: boolean;
    showEvents?: boolean;
    showRules?: boolean;
  };
  // 视图特定配置
  viewOptions?: {
    showLabels?: boolean;
    showRelationships?: boolean;
    clusterByFaction?: boolean;      // 按势力分组
    clusterByLocation?: boolean;     // 按地点分组
    highlightMainCharacters?: boolean; // 高亮主角
  };
}

// 图谱节点数据
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  name: string;
  description?: string;
  // 位置（用于可拖拽）
  x?: number;
  y?: number;
  // 样式
  color?: string;
  size?: number;
  icon?: string;
  // 关联数据
  data?: Character | Faction | Location | TimelineEvent | RuleSystem;
}

// 图谱连线数据
export interface GraphLink {
  id: string;
  source: string;      // 源节点ID
  target: string;      // 目标节点ID
  type: 'relationship' | 'belongs' | 'located' | 'event' | 'rule' | 'custom';
  label?: string;      // 连线标签
  strength?: number;   // 连线强度 (0-1)
  color?: string;
  dashed?: boolean;
}

// 图谱数据集
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// 节点选中事件
export interface NodeSelection {
  node: GraphNode;
  relatedNodes: string[];    // 相关节点ID列表
  relatedLinks: string[];    // 相关连线ID列表
}

// 存储配置接口
