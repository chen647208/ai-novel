/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * AI 网关 Provider（docs/design/05 §1 网关层）。
 *
 * 适配器全部在主进程执行：API Key 只出现在主进程与上游之间，渲染进程仅持
 * 类型化客户端（preload.aiGateway）。一次性补全经 invoke 直接返回；流式按
 * requestId 在 ai:stream:event 通道多路推送 delta/done/error 事件。
 * 取消：渲染端持 requestId 调 abort 通道，主进程 AbortController 中止底层 fetch。
 */
import { app, ipcMain } from 'electron';

import type { AiCallOptions, AIResponse, AiStreamEvent, ModelConfig } from '../../shared/types.js';
import type { Provider } from '../app/container.js';
import { withVaultKey } from '../app/secureStore.js';
import { IPC } from '../channels.js';
import { aiT, initAiI18n } from './i18n.js';
import { resolveAdapter } from './resolve.js';

/** 进行中的请求：requestId → 取消控制器。complete 与 stream 共用一张表。 */
const active = new Map<string, AbortController>();

export interface GatewayStreamOptions {
  retries?: number;
  signal?: AbortSignal;
}

/**
 * 流式执行核心（不依赖 electron，可单测）。
 * 不支持真流式的配置降级为一次性补全：结果块带 notice 提示（内容仍有效），
 * 与旧渲染端 callStreaming 的行为逐字段一致。
 */
export async function runAdapterStream(
  model: ModelConfig,
  prompt: string,
  requestId: string,
  emit: (event: AiStreamEvent) => void,
  options?: GatewayStreamOptions,
): Promise<void> {
  const adapter = resolveAdapter(model);
  const streamingSupported = model.supportsStreaming !== false && adapter.supportsStreaming(model);

  if (!streamingSupported) {
    const response = await adapter.complete(model, prompt, options);
    emit({
      t: 'done',
      requestId,
      response: {
        ...response,
        isComplete: true,
        isStreaming: false,
        notice: response.error ? undefined : aiT('streamingUnsupported'),
      },
    });
    return;
  }

  await adapter.stream(
    model,
    prompt,
    (chunk) => {
      if (chunk.isComplete) {
        emit({ t: 'done', requestId, response: chunk });
      } else {
        emit({ t: 'delta', requestId, accumulated: chunk.content, model: chunk.model, tokens: chunk.tokens });
      }
    },
    options,
  );
}

/** AI 网关 Provider：boot 注册 IPC，shutdown 中止所有在途请求。 */
export const aiGatewayProvider: Provider = {
  name: 'ai-gateway',
  async boot() {
    await initAiI18n(app.getLocale());

    ipcMain.handle(IPC.ai.complete, async (_event, requestId: string, model: ModelConfig, prompt: string, options?: AiCallOptions): Promise<AIResponse> => {
      if (typeof requestId !== 'string' || typeof prompt !== 'string' || !model) {
        throw new TypeError('Invalid ai:complete arguments');
      }
      // vault 引用在此统一解为明文：适配器拿到的永远是可用 Key，渲染端无需经手
      const keyed = await withVaultKey(model);
      if (!keyed.ok) throw new Error(keyed.error);
      const resolved = keyed.model;
      const controller = new AbortController();
      active.set(requestId, controller);
      try {
        return await resolveAdapter(resolved).complete(resolved, prompt, {
          retries: options?.retries ?? 2,
          signal: controller.signal,
          images: options?.images,
        });
      } finally {
        active.delete(requestId);
      }
    });

    ipcMain.handle(IPC.ai.streamOpen, async (event, requestId: string, model: ModelConfig, prompt: string, options?: AiCallOptions): Promise<boolean> => {
      if (typeof requestId !== 'string' || typeof prompt !== 'string' || !model) {
        throw new TypeError('Invalid ai:stream:open arguments');
      }
      const controller = new AbortController();
      active.set(requestId, controller);
      const sender = event.sender;
      const emit = (e: AiStreamEvent): void => {
        if (!sender.isDestroyed()) sender.send(IPC.ai.streamEvent, e);
      };
      // 窗口销毁时中止底层请求，避免孤儿流继续消耗上游配额
      sender.once('destroyed', () => {
        controller.abort();
        active.delete(requestId);
      });

      const keyed = await withVaultKey(model);
      if (!keyed.ok) {
        emit({ t: 'error', requestId, error: keyed.error });
        active.delete(requestId);
        return false;
      }
      runAdapterStream(keyed.model, prompt, requestId, emit, {
        retries: options?.retries ?? 2,
        signal: controller.signal,
      })
        .catch((error: unknown) => {
          emit({ t: 'error', requestId, error: error instanceof Error ? error.message : String(error) });
        })
        .finally(() => {
          active.delete(requestId);
        });
      return true;
    });

    ipcMain.handle(IPC.ai.abort, (_event, requestId: string): boolean => {
      const controller = active.get(requestId);
      if (controller) {
        active.delete(requestId);
        controller.abort();
      }
      return true;
    });
  },
  shutdown() {
    for (const controller of active.values()) controller.abort();
    active.clear();
  },
};
