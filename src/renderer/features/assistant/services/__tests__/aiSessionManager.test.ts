/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalBroker, SkillCatalog, ToolRegistry } from '@core/ai';
import { EventBus } from '@core/plugin';

const { mockComplete } = vi.hoisted(() => ({ mockComplete: vi.fn() }));
vi.mock('@/shared/services/ai/gatewayClient.js', () => ({
  aiGatewayClient: { complete: mockComplete, stream: vi.fn() },
}));

import { AiSessionManager } from '../aiSessionManager';
import type { ModelConfig, Project } from '../../../../../shared/types';

const model: ModelConfig = { id: 'm', name: 'M', provider: 'openai-chat', modelName: 'test' };
const project = { title: '测试书' } as unknown as Project;

describe('AiSessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // node 测试环境：stub window，走无 electronAPI 的无落盘路径
    vi.stubGlobal('window', { electronAPI: undefined });
  });

  it('无落盘环境下运行完整会话并保留事件', async () => {
    const { PromptAssembler } = await import('@core/ai');
    const assembler = new PromptAssembler();
    assembler.register({ id: 'identity', title: '身份', order: 10, render: () => '身份' });
    const manager = new AiSessionManager({
      assembler,
      registry: new ToolRegistry(),
      catalog: new SkillCatalog(),
      broker: new ApprovalBroker(),
      events: new EventBus(),
    });
    mockComplete.mockResolvedValue({ content: '{"reply":"回答"}', model: 'test' });

    const result = await manager.run({ bookId: 'b1', task: '写一段', project, model });
    expect(result.ok).toBe(true);
    expect(result.reply).toBe('回答');

    const types = manager.getEvents().map((e) => e.t);
    expect(types[0]).toBe('session.start');
    expect(types.at(-1)).toBe('session.end');
    expect(manager.pendingCount).toBe(0);
  });

  it('触发词命中的技能会话内激活、结束即卸载', async () => {
    const { PromptAssembler, parseSkillMd } = await import('@core/ai');
    const catalog = new SkillCatalog();
    const parsed = parseSkillMd(
      '---\nname: pov-switch\ndescription: POV 切换技巧。触发词：pov\n---\n方法论正文',
      'builtin',
    );
    catalog.register(parsed.skill!);

    const assembler = new PromptAssembler();
    assembler.register({ id: 'identity', title: '身份', order: 10, render: () => '身份' });
    const manager = new AiSessionManager({
      assembler,
      registry: new ToolRegistry(),
      catalog,
      broker: new ApprovalBroker(),
      events: new EventBus(),
    });

    // 捕获每轮装配时 catalog.getActive() 的可见性
    const seen: Array<string | null> = [];
    mockComplete.mockImplementation(async () => {
      seen.push(catalog.getActive()?.name ?? null);
      return { content: '{"reply":"ok"}', model: 'test' };
    });

    await manager.run({ task: '帮我看这段 POV 切换', project, model });
    expect(seen).toEqual(['pov-switch']);
    expect(catalog.getActive()).toBeNull();
  });

  it('无触发词命中时无技能注入', async () => {
    const { PromptAssembler } = await import('@core/ai');
    const manager = new AiSessionManager({
      assembler: new PromptAssembler(),
      registry: new ToolRegistry(),
      catalog: new SkillCatalog(),
      broker: new ApprovalBroker(),
      events: new EventBus(),
    });
    mockComplete.mockResolvedValue({ content: '{"reply":"r"}', model: 'test' });
    const result = await manager.run({ task: '普通任务', project, model });
    expect(result.ok).toBe(true);
  });
});
