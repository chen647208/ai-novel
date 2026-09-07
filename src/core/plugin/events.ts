/*
 * 本文件属于 织梦 (dreamweave) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 事件总线（docs/design/04 §8 三层事件域 + §5 能力接缝）。
 *
 * 1. 事实层（fact）：持久事实的发布（node.changed / ai.approved / …），
 *    宿主决定是否落 entity_changes/session log——总线只做分发。
 * 2. 拦截层（intercept）：ai.request / editor.transaction 等活体拦截，
 *    可 observe 可 veto（审批类）。
 * 3. 接缝层（decorate）：fs/*、ai/*、index/* 声明式策略——v0 实现
 *    ai.request 的 inject（注入系统提示文本）与 filter（输出过滤）。
 *
 * 事件名契约：核心事件 'core.*'，插件事件 'plugin.<shortId>.<event>'。
 * 纯模块，无 DOM / Electron 依赖。
 */

import type { Disposable } from './manifest.js';

export type SeamName = 'fs' | 'ai' | 'index';

/** ai 接缝策略（hooks 声明的 do 分支）。 */
export type SeamPolicy =
  | { do: 'inject'; where: 'system' | 'user'; text: string }
  | { do: 'filter'; pattern: string; replacement?: string };

/** 拦截器判定结果。 */
export interface VetoResult {
  allowed: boolean;
  reason?: string;
  /** 修改后继续传递的载荷（可选） */
  payload?: unknown;
}

export type ObserveHandler = (payload: unknown) => void;
export type InterceptHandler = (payload: unknown) => boolean | VetoResult | void;

interface Registration {
  pluginId?: string;
}

export class EventBus {
  private readonly observers = new Map<string, Set<ObserveHandler & Registration>>();
  private readonly interceptors = new Map<string, Set<InterceptHandler & Registration>>();
  private readonly seams = new Map<SeamName, Array<{ pluginId?: string; policy: SeamPolicy }>>();

  private track<T>(map: Map<string, Set<T & Registration>>, key: string, handler: T, pluginId?: string): Disposable {
    const set = map.get(key) ?? new Set();
    const wrapped = handler as T & Registration;
    wrapped.pluginId = pluginId;
    set.add(wrapped);
    map.set(key, set);
    return {
      dispose: () => {
        set.delete(wrapped);
        if (!set.size) map.delete(key);
      },
    };
  }

  /** 观察事实/事件（同步分发，不阻塞）。 */
  on(type: string, handler: ObserveHandler, pluginId?: string): Disposable {
    return this.track(this.observers, type, handler, pluginId);
  }

  /** 发布事件给观察者。 */
  emit(type: string, payload: unknown): void {
    for (const handler of this.observers.get(type) ?? []) {
      try {
        handler(payload);
      } catch {
        // 观察者异常不影响发布方
      }
    }
  }

  /** 注册活体拦截器（ai.request / editor.transaction 等）。 */
  intercept(type: string, handler: InterceptHandler, pluginId?: string): Disposable {
    return this.track(this.interceptors, type, handler, pluginId);
  }

  /**
   * 带拦截的请求：任一拦截器拒绝即阻断（返回首个拒绝原因）；
   * 拦截器可返回替换后的 payload（链式传递）。
   */
  request(type: string, payload: unknown): VetoResult {
    let current = payload;
    for (const handler of this.interceptors.get(type) ?? []) {
      let r: boolean | VetoResult | void;
      try {
        r = handler(current);
      } catch (error) {
        return { allowed: false, reason: error instanceof Error ? error.message : String(error) };
      }
      if (r === false) return { allowed: false, reason: `被 ${type} 拦截器拒绝` };
      if (r === true || r === undefined || r === null) continue;
      const veto = r as VetoResult;
      if (veto.allowed === false) return { allowed: false, reason: veto.reason };
      if ('payload' in veto && veto.payload !== undefined) current = veto.payload;
    }
    return { allowed: true, payload: current };
  }

  /** 声明接缝策略（hooks 落点）。 */
  decorate(seam: SeamName, policy: SeamPolicy, pluginId?: string): Disposable {
    const list = this.seams.get(seam) ?? [];
    const entry = { pluginId, policy };
    list.push(entry);
    this.seams.set(seam, list);
    return {
      dispose: () => {
        const cur = this.seams.get(seam) ?? [];
        const i = cur.indexOf(entry);
        if (i >= 0) cur.splice(i, 1);
      },
    };
  }

  /** 取某接缝的全部策略（unwind 后自动消失）。 */
  policiesFor(seam: SeamName): SeamPolicy[] {
    return (this.seams.get(seam) ?? []).map((e) => e.policy);
  }
}
