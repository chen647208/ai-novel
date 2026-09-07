/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { uuidv7, getInstanceId } from '../uuid';
import { hashEntity } from '../hash';
import { validateNode, validateEdge, validateAttribute } from '../validate';
import type { NodeEntity, EdgeEntity, AttributeEntity } from '../types';

describe('uuidv7', () => {
  it('符合 RFC 9562 格式与版本/变体位', () => {
    const id = uuidv7();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('时间有序：48 位时间戳前缀非递减', () => {
    const ids = Array.from({ length: 50 }, () => uuidv7());
    const prefixes = ids.map((id) => id.replace(/-/g, '').slice(0, 12));
    for (let i = 1; i < prefixes.length; i++) {
      expect(prefixes[i]! >= prefixes[i - 1]!).toBe(true);
    }
    // 同一毫秒内靠随机位区分：全部唯一
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getInstanceId 进程内稳定', () => {
    expect(getInstanceId()).toBe(getInstanceId());
  });
});

const node: NodeEntity = {
  id: 'n1',
  type: 'novel.chapter',
  title: '第一章',
  bookId: 'b1',
  body: '正文',
  createdAt: 100,
  updatedAt: 200,
  erased: false,
};

describe('hashEntity', () => {
  it('同一实体哈希稳定（确定性）', async () => {
    expect(await hashEntity('nodes', node)).toBe(await hashEntity('nodes', { ...node }));
  });

  it('哈希字段变化 → 哈希变化', async () => {
    const h1 = await hashEntity('nodes', node);
    const h2 = await hashEntity('nodes', { ...node, body: '改了' });
    expect(h1).not.toBe(h2);
  });

  it('非哈希字段（updatedAt/createdAt）变化 → 哈希不变', async () => {
    expect(await hashEntity('nodes', node)).toBe(await hashEntity('nodes', { ...node, updatedAt: 999 }));
  });

  it('不同实体名同 id 哈希不同（entityName 参与）', async () => {
    const edge: EdgeEntity = {
      id: 'n1', fromId: 'a', toId: 'b', kind: 'contain', position: 0, bookId: 'b1', erased: false,
    };
    expect(await hashEntity('nodes', node)).not.toBe(await hashEntity('edges', edge));
  });
});

describe('validate', () => {
  it('合法实体零错误', () => {
    expect(validateNode(node)).toEqual([]);
    const edge: EdgeEntity = { id: 'e1', fromId: 'a', toId: 'b', kind: 'contain', position: 0, bookId: 'b1', erased: false };
    expect(validateEdge(edge)).toEqual([]);
    const attr: AttributeEntity = { id: 'a1', nodeId: 'n1', type: 'label', name: 'status', value: 'draft', inheritable: false, position: 0, erased: false };
    expect(validateAttribute(attr)).toEqual([]);
  });

  it('非法 kind / 空 id 报错', () => {
    const badEdge: EdgeEntity = { id: '', fromId: 'a', toId: 'b', kind: 'bogus' as EdgeEntity['kind'], position: 0, bookId: 'b1', erased: false };
    expect(validateEdge(badEdge).length).toBeGreaterThan(0);
    expect(validateNode({ ...node, id: '' }).length).toBeGreaterThan(0);
  });
});
