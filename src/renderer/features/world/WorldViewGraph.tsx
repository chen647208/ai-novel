/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import { roleLabel } from '@/shared/utils/displayLabels';
import { normalizeRoleId } from '@/shared/utils/characterKinds';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { cn } from '@/shared/utils/cn';
import { Clock, Globe, ListTree, Map, Network, RefreshCw, Users, X } from 'lucide-react';
import {
  type Character, type Location, type Faction, type Timeline, type TimelineEvent,
  type RuleSystem, type WorldView, type DiagramType, type GraphLayout,
  type GraphNode, type GraphLink, type GraphData
} from '../../../shared/types';

interface WorldViewGraphProps {
  characters: Character[];
  locations?: Location[];
  factions?: Faction[];
  timeline?: Timeline;
  ruleSystems?: RuleSystem[];
  worldView?: WorldView;
  initialType?: DiagramType;
  onClose: () => void;
  onSelectNode?: (node: GraphNode) => void;
}

// 节点颜色映射：经主题 chart 令牌引用（深色自动切换，禁十六进制硬编码）
const NODE_COLORS = {
  character: 'var(--color-chart-1)',    // Blue
  character_main: 'var(--color-chart-2)', // Amber for main characters
  character_villain: 'var(--color-chart-3)', // Red for villains
  faction: 'var(--color-chart-4)',      // Purple
  location: 'var(--color-chart-5)',     // Emerald
  event: 'var(--color-chart-6)',        // Orange
  rule: 'var(--color-chart-7)',         // Pink
  worldview: 'var(--color-chart-8)',    // Cyan
};

// 角色类型映射（枚举比较，与语言无关）
const getCharacterColor = (role: string): string => {
  switch (normalizeRoleId(role, 'other')) {
    case 'protagonist': return NODE_COLORS.character_main;
    case 'antagonist': return NODE_COLORS.character_villain;
    case 'supporting': return NODE_COLORS.character;
    default: return 'var(--color-chart-gray)'; // Gray for others
  }
};

/** 侧栏分组小标题 */
const PanelLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground', className)}>{children}</div>
);

const WorldViewGraph: React.FC<WorldViewGraphProps> = ({
  characters,
  locations = [],
  factions = [],
  timeline,
  ruleSystems = [],
  initialType = 'mixed',
  onClose,
  onSelectNode
}) => {
  const { t } = useTranslation('world');
  // 状态
  const [activeType, setActiveType] = useState<DiagramType>(initialType);
  const [activeLayout, setActiveLayout] = useState<GraphLayout>('force');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [filters, setFilters] = useState({
    showCharacters: true,
    showFactions: true,
    showLocations: true,
    showEvents: true,
    showRules: true,
  });
  const [viewOptions, setViewOptions] = useState({
    showLabels: true,
    showRelationships: true,
    clusterByFaction: false,
    clusterByLocation: false,
    highlightMainCharacters: true,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 更新容器尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 生成图谱数据
  const graphData: GraphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // 根据类型过滤
    const includeCharacters = activeType === 'character' || activeType === 'mixed' || activeType === 'worldview';
    const includeFactions = activeType === 'faction' || activeType === 'mixed' || activeType === 'worldview';
    const includeLocations = activeType === 'location' || activeType === 'mixed' || activeType === 'worldview';
    const includeEvents = activeType === 'timeline' || activeType === 'mixed' || activeType === 'worldview';
    const includeRules = activeType === 'worldview';

    // 添加角色节点
    if (includeCharacters && filters.showCharacters) {
      characters.forEach((char, index) => {
        const angle = (index / Math.max(characters.length, 1)) * 2 * Math.PI;
        const radius = 200;
        nodes.push({
          id: `char-${char.id}`,
          type: 'character',
          name: char.name,
          description: `${roleLabel(char.role)} | ${char.age}`,
          x: nodePositions[`char-${char.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
          y: nodePositions[`char-${char.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
          color: getCharacterColor(char.role),
          size: normalizeRoleId(char.role, 'other') === 'protagonist' ? 40 : 30,
          icon: 'user',
          data: char
        });
      });

      // 角色关系连线
      characters.forEach(char => {
        characters.forEach(other => {
          if (char.id === other.id) return;
          if (char.relationships?.includes(other.name) || other.relationships?.includes(char.name)) {
            links.push({
              id: `link-char-${char.id}-${other.id}`,
              source: `char-${char.id}`,
              target: `char-${other.id}`,
              type: 'relationship',
              label: t('graph.link.relationship'),
              strength: 0.7
            });
          }
        });
      });
    }

    // 添加势力节点
    if (includeFactions && filters.showFactions) {
      factions.forEach((faction, index) => {
        const angle = ((index + 0.5) / Math.max(factions.length, 1)) * 2 * Math.PI;
        const radius = 320;
        nodes.push({
          id: `faction-${faction.id}`,
          type: 'faction',
          name: faction.name,
          description: faction.type,
          x: nodePositions[`faction-${faction.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
          y: nodePositions[`faction-${faction.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
          color: NODE_COLORS.faction,
          size: 45,
          icon: 'users',
          data: faction
        });

        // 势力与角色关联
        faction.memberCharacterIds?.forEach(charId => {
          links.push({
            id: `link-faction-${faction.id}-char-${charId}`,
            source: `char-${charId}`,
            target: `faction-${faction.id}`,
            type: 'belongs',
            label: t('graph.link.belongs'),
            strength: 0.5,
            dashed: true
          });
        });
      });
    }

    // 添加地点节点
    if (includeLocations && filters.showLocations) {
      locations.forEach((loc, index) => {
        const angle = ((index + 0.25) / Math.max(locations.length, 1)) * 2 * Math.PI;
        const radius = 400;
        nodes.push({
          id: `loc-${loc.id}`,
          type: 'location',
          name: loc.name,
          description: loc.type,
          x: nodePositions[`loc-${loc.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
          y: nodePositions[`loc-${loc.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
          color: NODE_COLORS.location,
          size: 35,
          icon: 'map-marker-alt',
          data: loc
        });
      });
    }

    // 添加事件节点
    if (includeEvents && filters.showEvents && timeline?.events) {
      timeline.events.forEach((event, index) => {
        const angle = (index / Math.max(timeline.events.length, 1)) * 2 * Math.PI;
        const radius = 280;
        nodes.push({
          id: `event-${event.id}`,
          type: 'event',
          name: event.title,
          description: event.date.display || `${event.date.year}`,
          x: nodePositions[`event-${event.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
          y: nodePositions[`event-${event.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
          color: NODE_COLORS.event,
          size: 32,
          icon: 'clock',
          data: event
        });

        // 事件与角色关联
        event.relatedCharacterIds?.forEach(charId => {
          links.push({
            id: `link-event-${event.id}-char-${charId}`,
            source: `event-${event.id}`,
            target: `char-${charId}`,
            type: 'event',
            label: t('graph.link.participates'),
            strength: 0.4,
            dashed: true
          });
        });
      });
    }

    // 添加规则系统节点
    if (includeRules && filters.showRules) {
      ruleSystems.forEach((rule, index) => {
        const angle = ((index + 0.75) / Math.max(ruleSystems.length, 1)) * 2 * Math.PI;
        const radius = 360;
        nodes.push({
          id: `rule-${rule.id}`,
          type: 'rule',
          name: rule.name,
          description: rule.type,
          x: nodePositions[`rule-${rule.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
          y: nodePositions[`rule-${rule.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
          color: NODE_COLORS.rule,
          size: 38,
          icon: 'cogs',
          data: rule
        });
      });
    }

    return { nodes, links };
  }, [characters, locations, factions, timeline, ruleSystems, activeType, filters, nodePositions, dimensions, t]);

  // 简单的力导向布局计算
  useEffect(() => {
    if (activeLayout !== 'force' || graphData.nodes.length === 0) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    let animationId: number;
    let iteration = 0;
    const maxIterations = 100;

    const applyForces = () => {
      if (iteration >= maxIterations) return;

      setNodePositions(prev => {
        const newPositions = { ...prev };
        const k = 0.05; // 引力常数
        const repulsion = 5000; // 斥力常数

        graphData.nodes.forEach(node => {
          let fx = 0, fy = 0;
          const x = newPositions[node.id]?.x ?? node.x ?? centerX;
          const y = newPositions[node.id]?.y ?? node.y ?? centerY;

          // 中心引力
          fx += (centerX - x) * k * 0.1;
          fy += (centerY - y) * k * 0.1;

          // 节点间斥力
          graphData.nodes.forEach(other => {
            if (node.id === other.id) return;
            const ox = newPositions[other.id]?.x ?? other.x ?? centerX;
            const oy = newPositions[other.id]?.y ?? other.y ?? centerY;
            const dx = x - ox;
            const dy = y - oy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = repulsion / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          });

          // 连线引力
          graphData.links.forEach(link => {
            if (link.source === node.id || link.target === node.id) {
              const otherId = link.source === node.id ? link.target : link.source;
              const other = graphData.nodes.find(n => n.id === otherId);
              if (other) {
                const ox = newPositions[otherId]?.x ?? other.x ?? centerX;
                const oy = newPositions[otherId]?.y ?? other.y ?? centerY;
                const dx = ox - x;
                const dy = oy - y;
                fx += dx * k * (link.strength || 0.5);
                fy += dy * k * (link.strength || 0.5);
              }
            }
          });

          newPositions[node.id] = { x: x + fx, y: y + fy };
        });

        return newPositions;
      });

      iteration++;
      animationId = requestAnimationFrame(applyForces);
    };

    // 延迟开始力导向布局
    const timer = setTimeout(applyForces, 100);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationId);
    };
  }, [activeLayout, graphData, dimensions]);

  // 重置布局
  const resetLayout = useCallback(() => {
    setNodePositions({});
    setSelectedNodeId(null);
  }, []);

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingId(nodeId);
    setSelectedNodeId(nodeId);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    setNodePositions(prev => ({
      ...prev,
      [draggingId]: { x: svgP.x, y: svgP.y }
    }));
  }, [draggingId]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // 获取节点位置
  const getNodePosition = useCallback((nodeId: string) => {
    return nodePositions[nodeId] ?? graphData.nodes.find(n => n.id === nodeId);
  }, [nodePositions, graphData.nodes]);

  // 选中的节点
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graphData.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData.nodes]);

  // 相关节点和连线
  const relatedData = useMemo(() => {
    if (!selectedNodeId) return { nodes: new Set<string>(), links: new Set<string>() };

    const relatedNodes = new Set<string>([selectedNodeId]);
    const relatedLinks = new Set<string>();

    graphData.links.forEach(link => {
      if (link.source === selectedNodeId) {
        relatedNodes.add(link.target);
        relatedLinks.add(link.id);
      } else if (link.target === selectedNodeId) {
        relatedNodes.add(link.source);
        relatedLinks.add(link.id);
      }
    });

    return { nodes: relatedNodes, links: relatedLinks };
  }, [selectedNodeId, graphData.links]);

  // 类型标签
  const typeLabels: Record<DiagramType, string> = {
    character: t('graph.viewType.character'),
    faction: t('graph.viewType.faction'),
    location: t('graph.viewType.location'),
    timeline: t('graph.viewType.timeline'),
    worldview: t('graph.viewType.worldview'),
    mixed: t('graph.viewType.mixed')
  };

  const nodeTypeLabel = (type: GraphNode['type']): string => {
    switch (type) {
      case 'character': return t('graph.nodeType.character');
      case 'faction': return t('graph.nodeType.faction');
      case 'location': return t('graph.nodeType.location');
      case 'event': return t('graph.nodeType.event');
      case 'rule': return t('graph.nodeType.rule');
      default: return t('graph.nodeType.other');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        hideClose
        className="flex h-full w-full max-w-none flex-row gap-0 overflow-hidden rounded-none border-0 p-0"
      >
        {/* 左侧导航面板 */}
        <div className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
          {/* 标题 */}
          <div className="border-b border-border p-5">
            <h2 className="font-serif text-lg font-medium text-foreground">{t('graph.title')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('graph.subtitle')}</p>
          </div>

          {/* 视图类型选择 */}
          <div className="border-b border-border p-4">
            <PanelLabel>{t('graph.viewTypeLabel')}</PanelLabel>
            <div className="space-y-1">
              {(['mixed', 'character', 'faction', 'location', 'timeline', 'worldview'] as DiagramType[]).map(type => {
                const TypeIcon = type === 'character' ? Users :
                  type === 'faction' ? ListTree :
                  type === 'location' ? Map :
                  type === 'timeline' ? Clock :
                  type === 'worldview' ? Globe : Network;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setActiveType(type); resetLayout(); }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition-colors',
                      activeType === type
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                    )}
                  >
                    <TypeIcon className="size-4 shrink-0" />
                    {typeLabels[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 布局选择 */}
          <div className="border-b border-border p-4">
            <PanelLabel>{t('graph.layoutLabel')}</PanelLabel>
            <div className="flex flex-wrap gap-2">
              {(['force', 'circular', 'hierarchical'] as const).map(layout => (
                <button
                  key={layout}
                  type="button"
                  onClick={() => { setActiveLayout(layout); resetLayout(); }}
                  className={cn(
                    'rounded-md border px-3 py-1 text-xs transition-colors',
                    activeLayout === layout
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent/40'
                  )}
                >
                  {t(`graph.layout.${layout}`)}
                </button>
              ))}
            </div>
          </div>

          {/* 筛选器 */}
          <div className="flex-1 overflow-y-auto p-4">
            <PanelLabel>{t('graph.filterLabel')}</PanelLabel>
            <div className="space-y-2">
              {(['showCharacters', 'showFactions', 'showLocations', 'showEvents', 'showRules'] as const).map(key => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={filters[key]}
                    onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="size-3.5 accent-primary"
                  />
                  <span>{t(`graph.filter.${key}`)}</span>
                </label>
              ))}
            </div>

            <PanelLabel className="mt-6">{t('graph.optionsLabel')}</PanelLabel>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={viewOptions.showLabels}
                  onChange={(e) => setViewOptions(prev => ({ ...prev, showLabels: e.target.checked }))}
                  className="size-3.5 accent-primary"
                />
                <span>{t('graph.option.showLabels')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={viewOptions.highlightMainCharacters}
                  onChange={(e) => setViewOptions(prev => ({ ...prev, highlightMainCharacters: e.target.checked }))}
                  className="size-3.5 accent-primary"
                />
                <span>{t('graph.option.highlightMainCharacters')}</span>
              </label>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-2 border-t border-border p-4">
            <Button variant="secondary" size="sm" className="w-full" onClick={resetLayout}>
              <RefreshCw className="size-3.5" />{t('graph.reset')}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
              <X className="size-3.5" />{t('graph.close')}
            </Button>
          </div>
        </div>

        {/* 主绘图区域 */}
        <div ref={containerRef} className="relative min-w-0 flex-1 overflow-hidden bg-background">
          {/* SVG 绘图区域 */}
          <svg
            ref={svgRef}
            className="h-full w-full cursor-grab active:cursor-grabbing"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* 绘制连线 */}
            {graphData.links.map(link => {
              const source = getNodePosition(link.source);
              const target = getNodePosition(link.target);
              if (!source || !target) return null;

              const isRelated = relatedData.links.has(link.id);
              const isDimmed = selectedNodeId && !isRelated;

              return (
                <g key={link.id}>
                  <line
                    x1={source.x} y1={source.y}
                    x2={target.x} y2={target.y}
                    stroke={isRelated ? 'var(--color-primary)' : 'var(--color-border)'}
                    strokeWidth={isRelated ? 2 : 1}
                    strokeDasharray={link.dashed ? '5,5' : '0'}
                    opacity={isDimmed ? 0.1 : isRelated ? 1 : 0.3}
                    className="transition-all duration-300"
                  />
                  {viewOptions.showLabels && link.label && (
                    <text
                      x={((source.x ?? 0) + (target.x ?? 0)) / 2}
                      y={((source.y ?? 0) + (target.y ?? 0)) / 2}
                      fill="var(--color-muted-foreground)"
                      fontSize="10"
                      textAnchor="middle"
                      opacity={isDimmed ? 0.1 : 0.7}
                    >
                      {link.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 绘制节点 */}
            {graphData.nodes.map(node => {
              const pos = getNodePosition(node.id);
              if (!pos) return null;

              const isSelected = selectedNodeId === node.id;
              const isRelated = relatedData.nodes.has(node.id);
              const isDimmed = selectedNodeId && !isRelated;

              // 根据节点类型调整大小
              const size = node.size || 30;
              const displaySize = isSelected ? size * 1.2 : size;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className={cn('cursor-pointer transition-all duration-300', draggingId === node.id && 'cursor-grabbing')}
                  onClick={() => {
                    if (!draggingId) {
                      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
                      onSelectNode?.(node);
                    }
                  }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  style={{
                    opacity: isDimmed ? 0.2 : 1,
                    pointerEvents: draggingId && draggingId !== node.id ? 'none' : 'auto'
                  }}
                >
                  {/* 外发光圈 */}
                  {isSelected && (
                    <circle r={displaySize + 8} fill={node.color} opacity={0.3} filter="url(#glow)" />
                  )}
                  {/* 主圆 */}
                  <circle
                    r={displaySize}
                    fill={node.color}
                    className="transition-all"
                  />
                  {/* 内圆 */}
                  <circle
                    r={displaySize * 0.75}
                    fill="var(--color-background)"
                  />
                  {/* 首字标识 */}
                  <text
                    dy=".1em"
                    textAnchor="middle"
                    fill={node.color}
                    fontSize={displaySize * 0.6}
                    fontWeight="500"
                    className="select-none pointer-events-none"
                  >
                    {node.name.charAt(0)}
                  </text>
                  {/* 名称标签 */}
                  {viewOptions.showLabels && (
                    <>
                      <text
                        y={displaySize + 15}
                        textAnchor="middle"
                        fill="var(--color-foreground)"
                        fontSize="11"
                        fontWeight="500"
                        className="select-none pointer-events-none"
                      >
                        {node.name}
                      </text>
                      <text
                        y={displaySize + 28}
                        textAnchor="middle"
                        fill="var(--color-muted-foreground)"
                        fontSize="9"
                        className="select-none pointer-events-none"
                      >
                        {node.description}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* 图例 */}
          <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card/90 p-3 backdrop-blur">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.legend')}</h4>
            <div className="space-y-1.5 text-xs">
              {(['character', 'faction', 'location', 'event', 'rule', 'worldview'] as const).map(type => (
                <div key={type} className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }}></span>
                  <span className="text-muted-foreground">{t(`graph.nodeType.${type}`)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 操作提示 */}
          {!selectedNodeId && (
            <div className="absolute bottom-4 right-4 rounded-md border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
              {draggingId ? t('graph.hintDragging') : t('graph.hintIdle')}
            </div>
          )}
        </div>

        {/* 右侧详情面板 */}
        {selectedNode && (
          <div className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
            <div className="border-b border-border p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedNode.color }}
                ></span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{nodeTypeLabel(selectedNode.type)}</span>
              </div>
              <h3 className="font-serif text-xl font-medium text-foreground">{selectedNode.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{selectedNode.description}</p>
            </div>

            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
              {/* 根据节点类型显示不同详情 */}
              {selectedNode.type === 'character' && selectedNode.data && (
                <>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.personality')}</h4>
                    <p className="text-sm text-foreground">{(selectedNode.data as Character).personality || t('graph.unset')}</p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.background')}</h4>
                    <p className="text-sm text-foreground">{(selectedNode.data as Character).background || t('graph.unset')}</p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.relationships')}</h4>
                    <p className="text-sm text-foreground">{(selectedNode.data as Character).relationships || t('graph.unset')}</p>
                  </div>
                </>
              )}

              {selectedNode.type === 'faction' && selectedNode.data && (
                <>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.description')}</h4>
                    <p className="text-sm text-foreground">{(selectedNode.data as Faction).description || t('graph.unset')}</p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.ideology')}</h4>
                    <p className="text-sm text-foreground">{(selectedNode.data as Faction).ideology || t('graph.unset')}</p>
                  </div>
                </>
              )}

              {selectedNode.type === 'location' && selectedNode.data && (
                <>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.description')}</h4>
                    <p className="text-sm text-foreground">{(selectedNode.data as Location).description || t('graph.unset')}</p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.tags')}</h4>
                    <p className="text-sm text-foreground">{(selectedNode.data as Location).tags?.join('、') || t('graph.unset')}</p>
                  </div>
                </>
              )}

              {selectedNode.type === 'event' && selectedNode.data && (
                <>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.time')}</h4>
                    <p className="text-sm text-foreground">{(selectedNode.data as TimelineEvent).date.display || `${(selectedNode.data as TimelineEvent).date.year}`}</p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.description')}</h4>
                    <p className="text-sm text-foreground">{(selectedNode.data as TimelineEvent).description}</p>
                  </div>
                </>
              )}

              {/* 相关节点 */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('graph.relatedCount', { count: relatedData.nodes.size - 1 })}</h4>
                <div className="space-y-1">
                  {Array.from(relatedData.nodes).filter(id => id !== selectedNode.id).map(nodeId => {
                    const node = graphData.nodes.find(n => n.id === nodeId);
                    if (!node) return null;
                    return (
                      <div
                        key={nodeId}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedNodeId(nodeId)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedNodeId(nodeId); } }}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-accent/40 hover:text-foreground"
                      >
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: node.color }}></span>
                        <span>{node.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-border p-4">
              <Button variant="secondary" size="sm" className="w-full" onClick={() => setSelectedNodeId(null)}>
                {t('graph.closeDetails')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorldViewGraph;
