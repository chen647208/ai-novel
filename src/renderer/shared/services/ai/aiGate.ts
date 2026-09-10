/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * AI 请求统一门（精简档等策略的唯一拦截点）。
 * 宿主在 aiRuntime 注册门实现；网关层（gatewayClient）所有 AI 出口先经此断言，
 * 保证"禁用全部 AI"不只覆盖会话链路，也覆盖各 feature 直调网关的路径。
 */
let gate: (() => void) | null = null;

export function setAiGate(fn: (() => void) | null): void {
  gate = fn;
}

/** 未注册门时放行；注册后由实现决定抛错（通常为策略禁用）。 */
export function assertAiAllowed(): void {
  gate?.();
}
