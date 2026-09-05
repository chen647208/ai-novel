/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * Agent 循环（docs/design/05 §4）：
 * assemble（PromptAssembler）→ llm（网关）→ 解析 tool_calls → 审批（三档）
 * → execute（注册表）→ 结果回填 → 循环，直到模型给出最终答复或到达轮数上限。
 * 全程向 AiSession 发事件；审批判定记 tool.approval（三级审计链第一级在 callId）。
 *
 * 协议：模型在需要工具时输出严格 JSON
 * {"reply": string, "toolCalls": [{"callId": string, "toolId": string, "args": object}]}
 * 无工具调用即为最终答复。解析/修复复用渲染端 callJSON 的容错语义。
 */
import type { AIResponse, ModelConfig } from '../../shared/types';
import type { ApprovalRouter } from './approval.js';
import type { PromptAssembler } from './promptAssembler.js';
import type { AiSession } from './session.js';
import type { ToolRegistry } from './tools.js';

export interface AgentTurnToolCall {
  callId: string;
  toolId: string;
  args: Record<string, unknown>;
}

interface AgentModelReply {
  reply: string;
  toolCalls?: AgentTurnToolCall[];
}

export interface AgentLoopDeps {
  assembler: PromptAssembler;
  registry: ToolRegistry;
  router: ApprovalRouter;
  session: AiSession;
  model: ModelConfig;
  /** 网关一次性补全（渲染端注入 gatewayClient/callJSON 能力） */
  complete: (model: ModelConfig, prompt: string, retries?: number) => Promise<AIResponse>;
  /** 索引快照等装配数据的获取器（每轮重取，保证新鲜）；extra 透传给 section */
  context: () => { project?: unknown; index?: unknown; activeSkill?: { name: string; body: string } | null; extra?: Record<string, unknown> };
  maxTurns?: number;
  signal?: AbortSignal;
}

export interface AgentTurnResult {
  ok: boolean;
  reply: string;
  turns: number;
  error?: string;
}

const DEFAULT_MAX_TURNS = 4;

/** 解析模型回复为 {reply, toolCalls}；容忍围栏与多余文字。 */
export function parseAgentReply(content: string): AgentModelReply {
  const text = content.trim();
  const fenced = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  const candidate = fenced?.[1]?.trim() ?? text;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    // 模型直接给了答复文本（未走 JSON 协议）：整段视为最终答复
    return { reply: text };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { reply: text };
  }
  const obj = parsed as { reply?: unknown; toolCalls?: unknown };
  const reply = typeof obj.reply === 'string' ? obj.reply : text;
  const toolCalls = Array.isArray(obj.toolCalls)
    ? obj.toolCalls
        .filter((c): c is AgentTurnToolCall =>
          typeof c === 'object' && c !== null
          && typeof (c as AgentTurnToolCall).toolId === 'string'
          && typeof (c as AgentTurnToolCall).callId === 'string')
        .map((c) => ({
          callId: c.callId,
          toolId: c.toolId,
          args: (typeof c.args === 'object' && c.args !== null ? c.args : {}) as Record<string, unknown>,
        }))
    : undefined;
  return { reply, toolCalls };
}

/** 运行一次完整会话（可含多轮工具循环）。事件全部落 session。 */
export async function runAgentSession(deps: AgentLoopDeps, task: string): Promise<AgentTurnResult> {
  const maxTurns = deps.maxTurns ?? DEFAULT_MAX_TURNS;
  const ctx = deps.context();
  const assembled = deps.assembler.assemble({
    project: ctx.project,
    index: ctx.index,
    activeSkill: ctx.activeSkill,
    extra: ctx.extra,
    userTask: task,
    toolSchemas: deps.registry.resolveSchemas(),
  });

  await deps.session.start();

  let prompt = assembled.prompt;
  let lastReply = '';
  let turn = 0;

  try {
    for (turn = 1; turn <= maxTurns; turn++) {
      if (deps.signal?.aborted) throw new Error('已取消');
      await deps.session.emit({ t: 'turn.start', turn, at: Date.now() });
      await deps.session.emit({ t: 'llm.request', turn, model: deps.model.modelName, promptChars: prompt.length, at: Date.now() });

      const response = await deps.complete(deps.model, prompt);
      if (response.error) {
        await deps.session.emit({ t: 'llm.error', turn, error: response.error, at: Date.now() });
        throw new Error(response.error);
      }
      await deps.session.emit({ t: 'llm.done', turn, tokens: response.tokens, at: Date.now() });

      const parsed = parseAgentReply(response.content);
      lastReply = parsed.reply || lastReply;

      const calls = parsed.toolCalls ?? [];
      if (!calls.length) break;

      // 工具结果以结构化文本回填，驱动下一轮
      const observations: string[] = [];
      for (const call of calls) {
        await deps.session.emit({ t: 'tool.call', turn, callId: call.callId, toolId: call.toolId, args: call.args, at: Date.now() });

        const spec = deps.registry.get(call.toolId);
        if (!spec) {
          await deps.session.emit({ t: 'tool.result', turn, callId: call.callId, ok: false, error: `未知工具：${call.toolId}`, at: Date.now() });
          observations.push(`[工具 ${call.toolId}] 失败：未知工具`);
          continue;
        }

        // read 直接放行，不产生审批事件；write:* 必须记录审批判定（审计链）
        if (spec.permission !== 'read') {
          const { allowed, decision } = await deps.router.authorize(spec.permission, {
            callId: call.callId,
            toolId: call.toolId,
            proposal: { title: `工具 ${call.toolId}（${spec.permission}）` },
          });
          await deps.session.emit({
            t: 'tool.approval', turn, callId: call.callId,
            verdict: allowed ? 'approved' : decision?.verdict ?? 'rejected',
            by: decision?.by ?? 'router', at: Date.now(),
          });
          if (!allowed) {
            observations.push(`[工具 ${call.toolId}] 审批未通过（${decision?.verdict ?? 'rejected'}），已挂起或被拒绝，继续其余工作。`);
            continue;
          }
        }

        const output = await deps.registry.execute(call.toolId, call.args, { ...ctx, signal: deps.signal }, call.callId);
        await deps.session.emit({ t: 'tool.result', turn, callId: call.callId, ok: output.ok, error: output.error, at: Date.now() });
        observations.push(`[工具 ${call.toolId}] ${output.ok ? '结果' : '失败'}：${JSON.stringify(output.data ?? output.error)?.slice(0, 2000)}`);
      }

      prompt = `${assembled.prompt}\n\n【工具执行记录】\n${observations.join('\n')}\n\n请基于以上工具结果继续：如已完成请直接给出答复；如需更多工具调用请输出 JSON。`;
      if (turn === maxTurns) {
        await deps.session.emit({ t: 'turn.end', turn, turns: turn, at: Date.now() });
        break;
      }
    }

    await deps.session.emit({ t: 'turn.end', turn, turns: turn, at: Date.now() });
    await deps.session.end(true);
    return { ok: true, reply: lastReply, turns: turn };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await deps.session.end(false, message);
    return { ok: false, reply: lastReply, turns: turn, error: message };
  }
}
