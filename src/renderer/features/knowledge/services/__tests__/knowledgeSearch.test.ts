/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSemantic, mockHybrid } = vi.hoisted(() => ({
  mockSemantic: vi.fn(),
  mockHybrid: vi.fn(),
}));

vi.mock('../vectorIntegrationService', () => ({
  vectorIntegrationService: {
    semanticSearchKnowledge: mockSemantic,
    hybridSearchKnowledge: mockHybrid,
  },
}));

import { searchKnowledge } from '../knowledgeSearch';
import type { KnowledgeItem } from '@shared/types';

const noSearch = async () => [];

const item = (id: string, name: string, content: string): KnowledgeItem => ({
  id, name, content, type: 'note', size: content.length, addedAt: 1, category: 'writing',
});

describe('searchKnowledge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('semantic：映射分数为 combinedScore', async () => {
    mockSemantic.mockResolvedValue([{ document: { id: 'a' }, score: 0.8, content: '', metadata: {} }]);
    const out = await searchKnowledge({ projectId: 'p', query: 'q', mode: 'semantic', categoryItems: [], search: noSearch });
    expect(out[0]).toMatchObject({ semanticScore: 0.8, combinedScore: 0.8, keywordScore: 0 });
  });

  it('keyword：短查询内存子串匹配', async () => {
    const items = [item('1', '魔法设定', '魔法学院的规则'), item('2', '地理', '大陆地形')];
    const out = await searchKnowledge({ projectId: 'p', query: '魔法', mode: 'keyword', categoryItems: items, search: noSearch });
    expect(out).toHaveLength(1);
    expect(out[0]!.combinedScore).toBe(1.0);
  });

  it('keyword：长查询走 FTS 并与分类取交集', async () => {
    const items = [item('1', '甲', '内容甲'), item('2', '乙', '内容乙')];
    const search = vi.fn(async () => [
      { scope: 'knowledge', id: '1' },
      { scope: 'knowledge', id: '不存在' },
    ]);
    const out = await searchKnowledge({ projectId: 'p', query: '关键词检索', mode: 'keyword', categoryItems: items, search });
    expect(out).toHaveLength(1);
    expect(out[0]!.document.id).toBe('1');
  });
});
