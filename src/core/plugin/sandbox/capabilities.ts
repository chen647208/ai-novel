/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 沙箱能力裁决（docs/design/21 §4）：默认拒绝。
 *
 * 约定 handler 返回 `{ output?, toolCalls? }`；toolCalls 只保留技能白名单内的工具，
 * 越界的进 `denied` 并计入结果，由宿主决定上报或忽略。handler 不直接触达数据，
 * 只能"提议"工具调用，由宿主在审批管线里执行。
 */

import type { SandboxRunResult, SandboxToolCall } from './types';

const MAX_TOOL_CALLS = 32;

interface HandlerProposal {
  output?: unknown;
  toolCalls?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 规整 handler 返回值并过滤工具调用。 */
export function adjudicateHandlerResult(
  raw: unknown,
  allowedTools: readonly string[],
): SandboxRunResult {
  if (!isRecord(raw)) {
    return { ok: true, output: raw };
  }
  // 非建议形态（无 output/toolCalls 键）的普通对象即输出本身
  if (!('output' in raw) && !('toolCalls' in raw)) {
    return { ok: true, output: raw };
  }
  const proposal = raw as HandlerProposal;
  const allowed = new Set(allowedTools);
  const toolCalls: SandboxToolCall[] = [];
  const denied: string[] = [];
  const list = Array.isArray(proposal.toolCalls) ? proposal.toolCalls.slice(0, MAX_TOOL_CALLS) : [];
  for (const item of list) {
    if (!isRecord(item) || typeof item.tool !== 'string') continue;
    if (allowed.has(item.tool)) {
      toolCalls.push({ tool: item.tool, args: item.args });
    } else {
      denied.push(item.tool);
    }
  }
  const result: SandboxRunResult = { ok: true, output: proposal.output, toolCalls };
  if (denied.length) {
    result.error = { kind: 'capability', message: `未授权工具调用被拒：${denied.join(', ')}` };
  }
  return result;
}
