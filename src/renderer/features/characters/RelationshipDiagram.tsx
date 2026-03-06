import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Character } from '../../../shared/types';

interface RelationshipDiagramProps {
  characters: Character[];
  onClose: () => void;
}

interface NodePosition {
  x: number;
  y: number;
}

const RelationshipDiagram: React.FC<RelationshipDiagramProps> = ({ characters, onClose }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const svgRef = useRef<SVGSVGElement>(null);

  // 自动检测关系连线
  const links = useMemo(() => {
    const result: { source: string; target: string; description: string }[] = [];
    characters.forEach(char => {
      characters.forEach(other => {
        if (char.id === other.id) return;
        // 检查关系文本中是否提到了对方的名字
        if (char.relationships.includes(other.name)) {
          result.push({
            source: char.id,
            target: other.id,
            description: char.relationships
          });
        }
      });
    });
    return result;
  }, [characters]);

  // 计算初始圆形布局
  const initialLayout = useMemo(() => {
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.3;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    const positions: Record<string, NodePosition> = {};
    characters.forEach((char, i) => {
      const angle = (i / characters.length) * 2 * Math.PI;
      positions[char.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
    return positions;
  }, [characters]);

  // 初始化或重置节点位置
  useEffect(() => {
    if (Object.keys(nodePositions).length === 0 && characters.length > 0) {
      setNodePositions(initialLayout);
    }
  }, [characters, initialLayout, nodePositions]);

  // 获取节点位置（优先使用拖拽后的位置，否则使用初始布局）
  const getNodePosition = (nodeId: string): NodePosition => {
    return nodePositions[nodeId] || initialLayout[nodeId] || { x: 0, y: 0 };
  };

  // 拖拽事件处理
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingId(nodeId);
    // 防止文本选中
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    // 更新被拖拽节点的位置
    setNodePositions(prev => ({
      ...prev,
      [draggingId]: {
        x: svgP.x,
        y: svgP.y
      }
    }));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const handleMouseLeave = () => {
    setDraggingId(null);
  };

  // 重置布局到圆形
  const resetLayout = () => {
    setNodePositions({});
  };

  // 组合节点数据（包含位置信息）
  const nodes = useMemo(() => {
    return characters.map(char => {
      const position = getNodePosition(char.id);
      return {
        ...char,
        x: position.x,
        y: position.y
      };
    });
  }, [characters, nodePositions, initialLayout]);

  const selectedChar = nodes.find(n => n.id === selectedId);

  const getRoleColor = (role: string) => {
    if (role.includes('主')) return '#fbbf24'; // Amber
    if (role.includes('反')) return '#ef4444'; // Red
    if (role.includes('配')) return '#3b82f6'; // Blue
    return '#94a3b8'; // Gray
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 flex items-center justify-center overflow-hidden animate-in fade-in duration-500">
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[120px]"></div>
      </div>

      <header className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">人物命运图谱</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Intertwined Destinies Map</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={resetLayout}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/10 flex items-center gap-2"
            title="重置为圆形布局"
          >
            <i className="fas fa-sync-alt"></i>
            重置布局
          </button>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </header>

      {/* SVG 绘图区域 */}
      <svg 
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* 绘制连线 */}
        {links.map((link, i) => {
          const source = nodes.find(n => n.id === link.source);
          const target = nodes.find(n => n.id === link.target);
          if (!source || !target) return null;

          const isRelatedToSelected = selectedId === link.source || selectedId === link.target;

          return (
            <line
              key={i}
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              stroke={isRelatedToSelected ? "#60a5fa" : "#334155"}
              strokeWidth={isRelatedToSelected ? 2 : 1}
              strokeDasharray={isRelatedToSelected ? "0" : "5,5"}
              className="transition-all duration-500"
              opacity={selectedId ? (isRelatedToSelected ? 1 : 0.1) : 0.4}
            />
          );
        })}

        {/* 绘制节点 */}
        {nodes.map((node) => (
          <g 
            key={node.id} 
            transform={`translate(${node.x}, ${node.y})`}
            className={`cursor-pointer transition-all duration-500 ${draggingId === node.id ? 'cursor-grabbing' : 'cursor-move'}`}
            onClick={(e) => {
              // 如果正在拖拽，不触发点击选中
              if (!draggingId) {
                setSelectedId(node.id === selectedId ? null : node.id);
              }
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            style={{ 
              opacity: selectedId ? (selectedId === node.id || links.some(l => (l.source === node.id && l.target === selectedId) || (l.target === node.id && l.source === selectedId)) ? 1 : 0.2) : 1,
              pointerEvents: draggingId && draggingId !== node.id ? 'none' : 'auto'
            }}
          >
            <circle 
              r={selectedId === node.id ? 45 : 35}
              fill={getRoleColor(node.role)}
              filter={selectedId === node.id ? "url(#glow)" : ""}
              className="transition-all"
            />
            <circle 
              r={selectedId === node.id ? 40 : 30}
              fill="#0f172a"
            />
            <text 
              dy=".3em" 
              textAnchor="middle" 
              fill="white" 
              className="text-[10px] font-black select-none pointer-events-none"
            >
              {node.name}
            </text>
            <text 
              y="50"
              textAnchor="middle" 
              fill={getRoleColor(node.role)} 
              className="text-[8px] font-black uppercase tracking-tighter select-none pointer-events-none opacity-60"
            >
              {node.role}
            </text>
          </g>
        ))}
      </svg>

      {/* 侧边信息卡片 */}
      {selectedChar && (
        <div className="absolute right-8 top-32 bottom-8 w-80 bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-white animate-in slide-in-from-right duration-500 shadow-2xl flex flex-col">
          <div className="mb-6">
            <span 
              className="text-[10px] font-black px-2 py-0.5 rounded uppercase mb-2 inline-block"
              style={{ backgroundColor: getRoleColor(selectedChar.role) + '33', color: getRoleColor(selectedChar.role) }}
            >
              {selectedChar.role}
            </span>
            <h3 className="text-3xl font-black">{selectedChar.name}</h3>
            <p className="text-gray-400 text-sm mt-1">年龄：{selectedChar.age}</p>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <i className="fas fa-heart text-red-400"></i> 核心关系网
              </h4>
              <p className="text-sm leading-relaxed text-gray-300 italic">
                {selectedChar.relationships || "暂无详细关系描述"}
              </p>
            </div>
            
            <div>
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">角色图谱说明</h4>
              <ul className="space-y-2">
                {links.filter(l => l.source === selectedId).map((link, i) => {
                  const target = nodes.find(n => n.id === link.target);
                  return (
                    <li key={i} className="text-xs bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="font-bold text-blue-400">→ {target?.name}</span>
                      <p className="mt-1 text-gray-400 opacity-80">存在交集</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <button 
            onClick={() => setSelectedId(null)}
            className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all"
          >
            返回全局视图
          </button>
        </div>
      )}

      {/* 操作提示 */}
      {!selectedId && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-white/50 text-xs font-medium">
          {draggingId ? '拖动节点调整位置，松开鼠标放置' : '点击节点查看详情，拖动节点调整位置'}
        </div>
      )}
    </div>
  );
};

export default RelationshipDiagram;






