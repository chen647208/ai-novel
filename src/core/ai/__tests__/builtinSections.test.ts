/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { PromptAssembler } from '../promptAssembler.js';
import { agentProtocolSection, registerBuiltinSections } from '../builtinSections.js';

describe('agentProtocolSection', () => {
  it('讲清 JSON 调用协议与多步策略', () => {
    const text = agentProtocolSection.render({}) ?? '';
    expect(text).toContain('toolCalls');
    expect(text).toContain('toolId');
    expect(text).toContain('先读后写');
    expect(text).toContain('审批');
  });

  it('注册顺序：技能之后、工具清单之前', () => {
    const asm = new PromptAssembler();
    registerBuiltinSections(asm);
    expect(asm.list()).toContain('agentProtocol');
    const result = asm.assemble({
      userTask: '查第三章并续写',
      toolSchemas: [{ id: 'core.chapter.read', description: '读单章', parameters: '{}' }],
    });
    const protocolAt = result.prompt.indexOf('调用协议');
    const toolsAt = result.prompt.indexOf('可用工具');
    const skillAt = result.prompt.indexOf('当前技能');
    expect(protocolAt).toBeGreaterThan(-1);
    expect(toolsAt).toBeGreaterThan(protocolAt);
    // 无激活技能时技能段缺席：协议仍在工具清单之前
    expect(skillAt === -1 || skillAt < protocolAt).toBe(true);
  });
});
