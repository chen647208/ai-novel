/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { stepForces } from '../graphLayout';

describe('stepForces', () => {
  it('相近两节点因斥力相互远离', () => {
    const before = { a: { x: 100, y: 100 }, b: { x: 110, y: 100 } };
    const after = stepForces(before, [{ id: 'a' }, { id: 'b' }], [], 100, 100);
    const a = after.a ?? before.a;
    const b = after.b ?? before.b;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(10);
  });

  it('孤立节点被拉向中心', () => {
    const after = stepForces({ a: { x: 0, y: 0 } }, [{ id: 'a' }], [], 200, 200);
    const a = after.a ?? { x: 0, y: 0 };
    expect(a.x).toBeGreaterThan(0);
    expect(a.y).toBeGreaterThan(0);
  });

  it('连线两端相互靠拢', () => {
    const before = { a: { x: 0, y: 0 }, b: { x: 400, y: 0 } };
    const after = stepForces(before, [{ id: 'a' }, { id: 'b' }], [{ source: 'a', target: 'b', strength: 1 }], 0, 0);
    const a = after.a ?? before.a;
    const b = after.b ?? before.b;
    expect(b.x - a.x).toBeLessThan(400);
  });
});
