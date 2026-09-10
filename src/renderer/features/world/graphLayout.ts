/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 世界图谱力导向布局（纯函数，无 DOM 依赖，可单测）。
 * 从 WorldViewGraph 组件抽出：中心引力 + 节点斥力 + 连线引力单步迭代。
 */

export interface GraphPoint {
  x: number;
  y: number;
}

export interface ForceNode {
  id: string;
  x?: number;
  y?: number;
}

export interface ForceLink {
  source: string;
  target: string;
  strength?: number;
}

/** 单步力导向：返回各节点新位置。current 可含历史位置，缺省回落到节点坐标/中心。 */
export function stepForces(
  current: Record<string, GraphPoint>,
  nodes: ForceNode[],
  links: ForceLink[],
  centerX: number,
  centerY: number,
  options: { springK?: number; repulsion?: number } = {},
): Record<string, GraphPoint> {
  const k = options.springK ?? 0.05;
  const repulsion = options.repulsion ?? 5000;
  const at = (id: string, fallback: GraphPoint): GraphPoint => {
    const cached = current[id];
    if (cached) return cached;
    const node = nodes.find((n) => n.id === id);
    if (node && typeof node.x === 'number' && typeof node.y === 'number') return { x: node.x, y: node.y };
    return fallback;
  };

  const next: Record<string, GraphPoint> = { ...current };
  for (const node of nodes) {
    const pos = at(node.id, { x: centerX, y: centerY });
    const x = pos.x;
    const y = pos.y;
    let fx = (centerX - x) * k * 0.1;
    let fy = (centerY - y) * k * 0.1;

    for (const other of nodes) {
      if (node.id === other.id) continue;
      const o = at(other.id, { x: centerX, y: centerY });
      const dx = x - o.x;
      const dy = y - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsion / (dist * dist);
      fx += (dx / dist) * force;
      fy += (dy / dist) * force;
    }

    for (const link of links) {
      if (link.source !== node.id && link.target !== node.id) continue;
      const otherId = link.source === node.id ? link.target : link.source;
      const o = at(otherId, { x: centerX, y: centerY });
      fx += (o.x - x) * k * (link.strength || 0.5);
      fy += (o.y - y) * k * (link.strength || 0.5);
    }

    next[node.id] = { x: x + fx, y: y + fy };
  }
  return next;
}
