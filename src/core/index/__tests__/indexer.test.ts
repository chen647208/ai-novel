/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import {
  buildIndex,
  IndexService,
  fingerprintEntities,
  serializeIndexSnapshot,
  deserializeIndexSnapshot,
} from '../indexer';
import { countWords } from '../words';
import type { AttributeEntity, BookEntities, EdgeEntity, NodeEntity } from '../../entities/types';

function node(partial: Partial<NodeEntity> & Pick<NodeEntity, 'id' | 'type'>): NodeEntity {
  return { title: '', bookId: 'b1', body: '', createdAt: 0, updatedAt: 0, erased: false, ...partial };
}
function edge(partial: Partial<EdgeEntity> & Pick<EdgeEntity, 'id' | 'fromId' | 'toId'>): EdgeEntity {
  return { kind: 'contain', position: 0, bookId: 'b1', erased: false, ...partial };
}
function attr(partial: Partial<AttributeEntity> & Pick<AttributeEntity, 'id' | 'nodeId' | 'name' | 'value'>): AttributeEntity {
  return { type: 'label', inheritable: false, position: 0, erased: false, ...partial };
}

const entities: BookEntities = {
  nodes: [
    node({ id: 'book', type: 'novel.book' }),
    node({ id: 'ch1', type: 'novel.chapter', title: '第一章', body: '# @pov: 林渊\n他走进了云都。' }),
    node({ id: 'ch2', type: 'novel.chapter', title: '第二章', body: '# @strand: 主线A\n[[林渊]]再次出现。' }),
    node({ id: 'c-lin', type: 'card.character', title: '林渊', body: '# @tag: 林渊 | 林师兄' }),
    node({ id: 'c-yun', type: 'card.location', title: '云都' }),
    node({ id: 'fs1', type: 'meta.foreshadow', title: '神秘玉佩' }),
    node({ id: 'erased', type: 'novel.chapter', title: '废弃', erased: true }),
  ],
  edges: [
    edge({ id: 'e1', fromId: 'book', toId: 'ch1', role: 'chapter', position: 1 }),
    edge({ id: 'e2', fromId: 'book', toId: 'ch2', role: 'chapter', position: 2 }),
    edge({ id: 'e3', fromId: 'book', toId: 'c-lin', role: 'card' }),
    edge({ id: 'e4', fromId: 'book', toId: 'c-yun', role: 'card' }),
    edge({ id: 'e5', fromId: 'book', toId: 'fs1', role: 'meta' }),
  ],
  attrs: [
    attr({ id: 'a1', nodeId: 'fs1', name: 'status', value: 'planted' }),
    attr({ id: 'a2', nodeId: 'fs1', name: 'importance', value: 'critical' }),
    attr({ id: 'a3', nodeId: 'fs1', name: 'plantedChapterOrder', value: '1' }),
  ],
};

describe('buildIndex', () => {
  const snap = buildIndex(entities);

  it('erased 节点退出索引', () => {
    expect(snap.wordCounts.has('erased')).toBe(false);
  });

  it('声明标签 + 别名解析 + 卡片隐式标题标签', () => {
    expect(snap.tags.get('林渊')?.nodeId).toBe('c-lin');
    expect(snap.tags.get('林渊')?.aliases).toEqual(['林师兄']);
    expect(snap.tags.get('云都')?.kind).toBe('implicit');
  });

  it('引用解析到目标并建立反链', () => {
    const refs = snap.refs.get('林渊') ?? [];
    expect(refs.some((r) => r.nodeId === 'ch1' && r.role === 'pov')).toBe(true);
    expect(snap.backlinks.get('c-lin')).toContain('ch1');
    expect(snap.hardLinks.get('ch2')).toEqual(['c-lin']);
  });

  it('未声明引用进 unresolved 完整性报告', () => {
    // ch1 的 @pov 林渊 已解析；构造一个未解析的
    const snap2 = buildIndex({
      ...entities,
      nodes: [...entities.nodes, node({ id: 'ch3', type: 'novel.chapter', body: '# @location: 不存在之地' })],
    });
    expect(snap2.unresolved.some((u) => u.target === '不存在之地')).toBe(true);
  });

  it('叙事线统计聚合场景', () => {
    const stat = snap.strandProgress.get('主线A');
    expect(stat?.sceneCount).toBe(1);
  });

  it('伏笔 planted 未回收 + 超期判定（maxOrder=2, planted=1, age=1 < 10）', () => {
    expect(snap.foreshadowOpen).toHaveLength(1);
    expect(snap.foreshadowOpen[0]).toMatchObject({ nodeId: 'fs1', importance: 'critical', ageChapters: 1, overdue: false });
  });

  it('字数 CJK 感知', () => {
    expect(countWords('你好世界 hello world')).toBe(6);
    expect(countWords('')).toBe(0);
    expect(snap.wordCounts.get('ch1')!).toBeGreaterThan(0);
  });
});

describe('IndexService', () => {
  it('rebuild 后 snapshot 命中，invalidate 后为 null', () => {
    const svc = new IndexService();
    svc.rebuild('b1', entities);
    expect(svc.snapshot('b1')).not.toBeNull();
    svc.invalidate('b1');
    expect(svc.snapshot('b1')).toBeNull();
  });

  it('相同输入命中指纹短路，复用缓存快照（revision 不变）', () => {
    const svc = new IndexService();
    const s1 = svc.rebuild('b1', entities);
    const s2 = svc.rebuild('b1', entities);
    expect(s2).toBe(s1);
    expect(s2.revision).toBe(s1.revision);
  });

  it('内容变化触发重算，revision 递增', () => {
    const svc = new IndexService();
    const r1 = svc.rebuild('b1', entities).revision;
    const changed: BookEntities = {
      ...entities,
      nodes: entities.nodes.map((n) => (n.id === 'ch1' ? { ...n, body: '# @pov: 林渊\n他离开了云都。' } : n)),
    };
    const r2 = svc.rebuild('b1', changed).revision;
    expect(r2).toBeGreaterThan(r1);
  });

  it('force=true 忽略指纹强制重算', () => {
    const svc = new IndexService();
    const r1 = svc.rebuild('b1', entities).revision;
    const r2 = svc.rebuild('b1', entities, true).revision;
    expect(r2).toBeGreaterThan(r1);
  });

  it('clear 后重新 rebuild 视为新缓存', () => {
    const svc = new IndexService();
    svc.rebuild('b1', entities);
    svc.clear();
    expect(svc.snapshot('b1')).toBeNull();
    // clear 后指纹也清空，相同输入会重算而非命中旧缓存
    const s = svc.rebuild('b1', entities);
    expect(s).not.toBeNull();
  });
});

describe('fingerprintEntities', () => {
  it('相同实体集指纹一致', () => {
    expect(fingerprintEntities(entities)).toBe(fingerprintEntities(entities));
  });

  it('正文改动改变指纹（杜绝陈旧索引）', () => {
    const base = fingerprintEntities(entities);
    const changed: BookEntities = {
      ...entities,
      nodes: entities.nodes.map((n) => (n.id === 'ch1' ? { ...n, body: n.body + '追加一句' } : n)),
    };
    expect(fingerprintEntities(changed)).not.toBe(base);
  });

  it('等长正文替换也改变指纹（长度代理不够，必须覆盖内容）', () => {
    const base = fingerprintEntities(entities);
    const sameLen: BookEntities = {
      ...entities,
      nodes: entities.nodes.map((n) => (n.id === 'c-lin' ? { ...n, title: '林某' } : n)),
    };
    expect(fingerprintEntities(sameLen)).not.toBe(base);
  });

  it('属性值改动改变指纹', () => {
    const base = fingerprintEntities(entities);
    const changed: BookEntities = {
      ...entities,
      attrs: entities.attrs.map((a) => (a.id === 'a2' ? { ...a, value: 'minor' } : a)),
    };
    expect(fingerprintEntities(changed)).not.toBe(base);
  });
});

describe('serializeIndexSnapshot', () => {
  it('序列化→反序列化保真（Map 内容一致）', () => {
    const snap = buildIndex(entities);
    const round = deserializeIndexSnapshot(serializeIndexSnapshot(snap));
    expect(round.bookId).toBe(snap.bookId);
    expect(round.revision).toBe(snap.revision);
    expect([...round.tags]).toEqual([...snap.tags]);
    expect([...round.refs]).toEqual([...snap.refs]);
    expect([...round.hardLinks]).toEqual([...snap.hardLinks]);
    expect([...round.backlinks]).toEqual([...snap.backlinks]);
    expect([...round.wordCounts]).toEqual([...snap.wordCounts]);
    expect([...round.strandProgress]).toEqual([...snap.strandProgress]);
    expect(round.foreshadowOpen).toEqual(snap.foreshadowOpen);
    expect(round.unresolved).toEqual(snap.unresolved);
  });

  it('经 JSON 传输后仍可还原（IPC 场景）', () => {
    const snap = buildIndex(entities);
    const wire = JSON.parse(JSON.stringify(serializeIndexSnapshot(snap)));
    const round = deserializeIndexSnapshot(wire);
    expect(round.tags.get('林渊')?.nodeId).toBe('c-lin');
    expect(round.foreshadowOpen[0]?.nodeId).toBe('fs1');
  });
});
