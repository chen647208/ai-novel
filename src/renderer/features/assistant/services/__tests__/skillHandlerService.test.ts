/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { Skill } from '@core/ai';
import { afterEach,describe, expect, it, vi } from 'vitest';

import { runSkillHandler } from '../skillHandlerService';

const skill = (over: Partial<Skill> = {}): Skill => ({
  name: 's',
  description: 'd',
  triggers: [],
  tools: ['core.index.query'],
  hosts: [],
  source: 'plugin',
  body: '',
  ...over,
});

describe('runSkillHandler（双轨逻辑轨）', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('无 handler 报 runtime', async () => {
    const result = await runSkillHandler(skill(), {});
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('无逻辑处理器');
  });

  it('调用沙箱并按技能白名单裁决工具调用', async () => {
    const run = vi.fn(async () => ({
      ok: true,
      output: {
        output: { text: 'hi' },
        toolCalls: [{ tool: 'core.index.query', args: {} }, { tool: 'core.shell.exec' }],
      },
    }));
    vi.stubGlobal('window', { electronAPI: { pluginSandboxRun: run } });

    const result = await runSkillHandler(
      skill({ handler: { code: 'function run(){return 1;}', sourceFile: 'x' } }),
      { q: 'x' },
    );
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ allowedTools: ['core.index.query'] }));
    expect(result.output).toEqual({ text: 'hi' });
    expect(result.toolCalls).toEqual([{ tool: 'core.index.query', args: {} }]);
    expect(result.error?.kind).toBe('capability');
  });

  it('沙箱失败原样返回', async () => {
    vi.stubGlobal('window', {
      electronAPI: { pluginSandboxRun: async () => ({ ok: false, error: { kind: 'timeout', message: 't' } }) },
    });
    const result = await runSkillHandler(skill({ handler: { code: '', sourceFile: 'x' } }), {});
    expect(result.error?.kind).toBe('timeout');
  });
});
