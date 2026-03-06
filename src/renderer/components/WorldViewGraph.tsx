import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Character, Location, Faction, Timeline, TimelineEvent, 
  RuleSystem, WorldView, DiagramType, GraphLayout, 
  GraphNode, GraphLink, GraphData, NodeSelection 
} from '../types';

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

// 节点颜色映射
const NODE_COLORS: Record<string, string> = {
  character: '#3b82f6',    // Blue
  character_main: '#fbbf24', // Amber for main characters
  character_villain: '#ef4444', // Red for villains
  faction: '#8b5cf6',      // Purple
  location: '#10b981',     // Emerald
  event: '#f97316',        // Orange
  rule: '#ec4899',         // Pink
  worldview: '#06b6d4',    // Cyan
};

// 角色类型映射
const getCharacterColor = (role: string): string => {
  if (role.includes('主')) return NODE_COLORS.character_main;
  if (role.includes('反')) return NODE_COLORS.character_villain;
  if (role.includes('配')) return NODE_COLORS.character;
  return '#94a3b8'; // Gray for others
};

const WorldViewGraph: React.FC<WorldViewGraphProps> = ({
  characters,
  locations = [],
  factions = [],
  timeline,
  ruleSystems = [],
  worldView,
  initialType = 'mixed',
  onClose,
  onSelectNode
}) => {
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
          description: `${char.role} | ${char.age}`,
          x: nodePositions[`char-${char.id}`]?.x ?? (centerX + radius * Math.cos(angle)),
          y: nodePositions[`char-${char.id}`]?.y ?? (centerY + radius * Math.sin(angle)),
          color: getCharacterColor(char.role),
          size: char.role.includes('主') ? 40 : 30,
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
              label: '关联',
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
            label: '成员',
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
            label: '参与',
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
  }, [characters, locations, factions, timeline, ruleSystems, activeType, filters, nodePositions, dimensions]);

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
    character: '角色关系',
    faction: '势力网络',
    location: '地理关联',
    timeline: '时间线',
    worldview: '世界观',
    mixed: '综合视图'
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 flex animate-in fade-in duration-500">
      {/* 左侧导航面板 */}
      <div className="w-72 bg-gray-900 border-r border-white/10 flex flex-col">
        {/* 标题 */}
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-black text-white">世界观关系图谱</h2>
          <p className="text-gray-500 text-xs mt-1">World View Visualization</p>
        </div>

        {/* 视图类型选择 */}
        <div className="p-4 border-b border-white/10">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">视图类型</label>
          <div className="space-y-2">
            {(['mixed', 'character', 'faction', 'location', 'timeline', 'worldview'] as DiagramType[]).map(type => (
              <button
                key={type}
                onClick={() => { setActiveType(type); resetLayout(); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  activeType === type 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <i className={`fas fa-${
                  type === 'character' ? 'users' :
                  type === 'faction' ? 'sitemap' :
                  type === 'location' ? 'map' :
                  type === 'timeline' ? 'clock' :
                  type === 'worldview' ? 'globe' : 'project-diagram'
                } mr-2`}></i>
                {typeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        {/* 布局选择 */}
        <div className="p-4 border-b border-white/10">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">布局方式</label>
          <div className="flex flex-wrap gap-2">
            {(['force', 'circular', 'hierarchical'] as GraphLayout[]).map(layout => (
              <button
                key={layout}
                onClick={() => { setActiveLayout(layout); resetLayout(); }}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  activeLayout === layout 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {layout === 'force' ? '力导向' : layout === 'circular' ? '圆形' : '层次'}
              </button>
            ))}
          </div>
        </div>

        {/* 筛选器 */}
        <div className="p-4 border-b border-white/10 flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">显示筛选</label>
          <div className="space-y-2">
            {Object.entries(filters).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="rounded bg-white/10 border-white/20 text-blue-600"
                />
                <span>{
                  key === 'showCharacters' ? '角色' :
                  key === 'showFactions' ? '势力' :
                  key === 'showLocations' ? '地点' :
                  key === 'showEvents' ? '事件' : '规则'
                }</span>
              </label>
            ))}
          </div>

          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block mt-6">视图选项</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={viewOptions.showLabels}
                onChange={(e) => setViewOptions(prev => ({ ...prev, showLabels: e.target.checked }))}
                className="rounded bg-white/10 border-white/20 text-blue-600"
              />
              <span>显示标签</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={viewOptions.highlightMainCharacters}
                onChange={(e) => setViewOptions(prev => ({ ...prev, highlightMainCharacters: e.target.checked }))}
                className="rounded bg-white/10 border-white/20 text-blue-600"
              />
              <span>高亮主角</span>
            </label>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={resetLayout}
            className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-all mb-2"
          >
            <i className="fas fa-sync-alt mr-2"></i>重置布局
          </button>
          <button 
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm transition-all"
          >
            <i className="fas fa-times mr-2"></i>关闭
          </button>
        </div>
      </div>

      {/* 主绘图区域 */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[150px]"></div>
        </div>

        {/* SVG 绘图区域 */}
        <svg 
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
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
                  stroke={isRelated ? '#60a5fa' : '#334155'}
                  strokeWidth={isRelated ? 2 : 1}
                  strokeDasharray={link.dashed ? '5,5' : '0'}
                  opacity={isDimmed ? 0.1 : isRelated ? 1 : 0.3}
                  className="transition-all duration-300"
                />
                {viewOptions.showLabels && link.label && (
                  <text
                    x={(source.x + target.x) / 2}
                    y={(source.y + target.y) / 2}
                    fill="#64748b"
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
                className={`cursor-pointer transition-all duration-300 ${draggingId === node.id ? 'cursor-grabbing' : ''}`}
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
                  fill="#0f172a"
                />
                {/* 图标 */}
                <text 
                  dy=".1em"
                  textAnchor="middle" 
                  fill="white" 
                  fontSize={displaySize * 0.5}
                  className="select-none pointer-events-none"
                  style={{ fontFamily: 'FontAwesome' }}
                >
                  <tspan>❤</tspan>
                </text>
                {/* 名称标签 */}
                {viewOptions.showLabels && (
                  <>
                    <text 
                      y={displaySize + 15}
                      textAnchor="middle" 
                      fill="white" 
                      fontSize="11"
                      fontWeight="bold"
                      className="select-none pointer-events-none"
                    >
                      {node.name}
                    </text>
                    <text 
                      y={displaySize + 28}
                      textAnchor="middle" 
                      fill="#94a3b8" 
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
        <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">图例</h4>
          <div className="space-y-1.5 text-xs">
            {Object.entries(NODE_COLORS).filter(([k]) => !k.includes('_')).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                <span className="text-gray-400">{
                  type === 'character' ? '角色' :
                  type === 'faction' ? '势力' :
                  type === 'location' ? '地点' :
                  type === 'event' ? '事件' :
                  type === 'rule' ? '规则' : '世界观'
                }</span>
              </div>
            ))}
          </div>
        </div>

        {/* 操作提示 */}
        {!selectedNodeId && (
          <div className="absolute bottom-4 right-4 px-4 py-2 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 text-white/50 text-xs">
            {draggingId ? '拖动节点调整位置' : '点击选中节点，拖动调整位置'}
          </div>
        )}
      </div>

      {/* 右侧详情面板 */}
      {selectedNode && (
        <div className="w-80 bg-gray-900 border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <span 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedNode.color }}
              ></span>
              <span className="text-xs font-bold text-gray-500 uppercase">{
                selectedNode.type === 'character' ? '角色' :
                selectedNode.type === 'faction' ? '势力' :
                selectedNode.type === 'location' ? '地点' :
                selectedNode.type === 'event' ? '事件' :
                selectedNode.type === 'rule' ? '规则' : '节点'
              }</span>
            </div>
            <h3 className="text-2xl font-black text-white">{selectedNode.name}</h3>
            <p className="text-gray-400 text-sm mt-1">{selectedNode.description}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {/* 根据节点类型显示不同详情 */}
            {selectedNode.type === 'character' && selectedNode.data && (
              <>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">性格特征</h4>
                  <p className="text-sm text-gray-300">{(selectedNode.data as Character).personality || '未设置'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">背景故事</h4>
                  <p className="text-sm text-gray-300">{(selectedNode.data as Character).background || '未设置'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">关系网络</h4>
                  <p className="text-sm text-gray-300">{(selectedNode.data as Character).relationships || '未设置'}</p>
                </div>
              </>
            )}

            {selectedNode.type === 'faction' && selectedNode.data && (
              <>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">描述</h4>
                  <p className="text-sm text-gray-300">{(selectedNode.data as Faction).description || '未设置'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">理念</h4>
                  <p className="text-sm text-gray-300">{(selectedNode.data as Faction).ideology || '未设置'}</p>
                </div>
              </>
            )}

            {selectedNode.type === 'location' && selectedNode.data && (
              <>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">描述</h4>
                  <p className="text-sm text-gray-300">{(selectedNode.data as Location).description || '未设置'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">标签</h4>
                  <p className="text-sm text-gray-300">{(selectedNode.data as Location).tags?.join('、') || '未设置'}</p>
                </div>
              </>
            )}

            {selectedNode.type === 'event' && selectedNode.data && (
              <>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">时间</h4>
                  <p className="text-sm text-gray-300">{(selectedNode.data as TimelineEvent).date.display || `${(selectedNode.data as TimelineEvent).date.year}`}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">描述</h4>
                  <p className="text-sm text-gray-300">{(selectedNode.data as TimelineEvent).description}</p>
                </div>
              </>
            )}

            {/* 相关节点 */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">相关节点 ({relatedData.nodes.size - 1})</h4>
              <div className="space-y-2">
                {Array.from(relatedData.nodes).filter(id => id !== selectedNode.id).map(nodeId => {
                  const node = graphData.nodes.find(n => n.id === nodeId);
                  if (!node) return null;
                  return (
                    <div 
                      key={nodeId}
                      onClick={() => setSelectedNodeId(nodeId)}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }}></span>
                      <span className="text-sm text-gray-300">{node.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-white/10">
            <button 
              onClick={() => setSelectedNodeId(null)}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-gray-300 transition-all"
            >
              关闭详情
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldViewGraph;
