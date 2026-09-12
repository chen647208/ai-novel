/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it } from 'vitest';

import { adjudicateHandlerResult } from '../capabilities';

describe('adjudicateHandlerResult（能力默认拒绝）', () => {
  it('白名单内工具调用保留', () => {
    const result = adjudicateHandlerResult(
      { output: { text: 'ok' }, toolCalls: [{ tool: 'core.index.query', args: { q: 'x' } }] },
      ['core.index.query'],
    );
    expect(result.ok).toBe(true);
    expect(result.output).toEqual({ text: 'ok' });
    expect(result.toolCalls).toEqual([{ tool: 'core.index.query', args: { q: 'x' } }]);
    expect(result.error).toBeUndefined();
  });

  it('越界工具调用被拒并记 capability 错误', () => {
    const result = adjudicateHandlerResult(
      { toolCalls: [{ tool: 'core.shell.exec', args: {} }] },
      ['core.index.query'],
    );
    expect(result.toolCalls).toEqual([]);
    expect(result.error?.kind).toBe('capability');
    expect(result.error?.message).toContain('core.shell.exec');
  });

  it('非对象返回值原样作为输出', () => {
    expect(adjudicateHandlerResult('hello', [])).toEqual({ ok: true, output: 'hello' });
  });

  it('工具调用数量封顶', () => {
    const toolCalls = Array.from({ length: 100 }, () => ({ tool: 'core.index.query' }));
    const result = adjudicateHandlerResult({ toolCalls }, ['core.index.query']);
    expect(result.toolCalls?.length).toBe(32);
  });
});
