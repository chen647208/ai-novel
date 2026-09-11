/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { McpProposalExec } from '@core/ai';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import type { Project } from '../../../../../shared/types';

vi.mock('@/shared/services/ai/gatewayClient.js', () => ({
  aiGatewayClient: { complete: vi.fn(), stream: vi.fn() },
}));

import { useProjectStore } from '@/app/stores/projectStore';

import { executeMcpProposal } from '../mcpProposalExecutor';

function book(): Project {
  return {
    id: 'book1',
    title: '测试书',
    inspiration: '',
    intro: '',
    characters: [],
    outline: '',
    chapters: [{ id: 'ch1', title: '第一章', summary: '细纲', content: '旧正文', order: 0 }],
    virtualChapters: [],
    knowledge: [],
    lastModified: 1,
  };
}

beforeEach(() => {
  useProjectStore.getState().hydrate([book()], 'book1');
});

describe('executeMcpProposal', () => {
  it('章节写：快照旧正文后覆写', async () => {
    const exec: McpProposalExec = { kind: 'chapter-write', bookId: 'book1', nodeId: 'ch1', title: '重写', body: '新正文' };
    const r = await executeMcpProposal(exec, 'mcp_x');
    expect(r.ok).toBe(true);
    expect(r.applied).toContain('第 1 章');
    const ch = useProjectStore.getState().projects[0]!.chapters[0]!;
    expect(ch.content).toBe('新正文');
    expect(ch.snapshots?.some((s) => s.content === '旧正文')).toBe(true);
  });

  it('章节目标缺失时保留待审（ok=false，不断言删除）', async () => {
    const r = await executeMcpProposal(
      { kind: 'chapter-write', bookId: 'book1', nodeId: 'nope', title: 'x', body: 'y' },
      'mcp_x',
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain('没有该章节');
  });

  it('卡片写无可用模型时回落知识库追加（不丢字）', async () => {
    const body = '神秘反派设定…';
    const r = await executeMcpProposal(
      { kind: 'card-write', bookId: 'book1', type: 'character', title: '新反派', body },
      'mcp_x',
    );
    expect(r.ok).toBe(true);
    const knowledge = useProjectStore.getState().projects[0]!.knowledge;
    expect(knowledge.some((k) => k.name === '新反派' && k.content === body)).toBe(true);
  });

  it('卡片写缺 bookId 直接拒绝', async () => {
    const r = await executeMcpProposal(
      { kind: 'card-write', type: 'character', title: 'x', body: 'y' },
      'mcp_x',
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain('bookId');
  });
});
