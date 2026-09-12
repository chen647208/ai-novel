/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 双轨技能的逻辑轨执行（docs/design/05 §9.2）：把技能 handler 送进隔离沙箱，
 * 返回值经能力白名单裁决。handler 只能"提议"工具调用，不直接触达数据。
 */

import type { Skill } from '@core/ai';
import { adjudicateHandlerResult, type SandboxRunResult } from '@core/plugin';

export async function runSkillHandler(skill: Skill, input: unknown): Promise<SandboxRunResult> {
  const handler = skill.handler;
  if (!handler) {
    return { ok: false, error: { kind: 'runtime', message: `技能 ${skill.name} 无逻辑处理器` } };
  }
  const api = typeof window === 'undefined' ? undefined : window.electronAPI;
  if (!api?.pluginSandboxRun) {
    return { ok: false, error: { kind: 'runtime', message: '当前环境不支持插件沙箱' } };
  }
  const result = await api.pluginSandboxRun({
    code: handler.code,
    input,
    allowedTools: skill.tools,
    mode: handler.mode ?? 'js',
    moduleBase64: handler.mode === 'wasm' ? handler.code : undefined,
  });
  if (!result.ok) return result;
  return adjudicateHandlerResult(result.output, skill.tools);
}
