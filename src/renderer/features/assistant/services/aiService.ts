/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { type ModelConfig, type AIResponse, type StreamingCallback, type AIHistoryRecord } from "../../../../shared/types";
import { i18n } from "@/i18n";
import { resolveAdapter } from "../../../shared/services/ai/resolve.js";
import type { CallOptions } from "../../../shared/services/ai/types.js";
import { callJSON, type JSONCallOptions, type JSONCallResult } from "../../../shared/services/ai/json.js";

/**
 * AI 服务门面。
 * 协议实现已迁移至 src/renderer/shared/services/ai/（适配器架构），
 * 本类保留历史静态 API（call / callStreaming / testConnection / buildHistoryRecordData），
 * 新增可选 options 参数支持取消信号与重试控制，调用方无需改动。
 */
export class AIService {
  // 辅助函数：构建AI历史记录所需的数据
  static buildHistoryRecordData(
    chapterId: string,
    prompt: string,
    generatedContent: string,
    model: ModelConfig,
    response: AIResponse,
    metadata?: { templateName?: string; batchGeneration?: boolean; chapterTitle?: string; generatedChapterCount?: number; operationType?: string }
  ): AIHistoryRecord {
    return {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chapterId,
      timestamp: Date.now(),
      prompt,
      generatedContent,
      modelConfig: {
        modelName: model.modelName,
        provider: model.provider,
        temperature: model.temperature,
        maxTokens: model.maxTokens
      },
      tokens: response.tokens,
      metadata
    };
  }

  /** 一次性补全。错误经 AIResponse.error 返回，不抛出；支持 signal 取消与自动重试。 */
  static async call(model: ModelConfig, prompt: string, options?: CallOptions): Promise<AIResponse> {
    if (!model) {
      return {
        content: "",
        error: i18n.t('errors:noValidModel')
      };
    }
    return resolveAdapter(model).complete(model, prompt, options);
  }

  /** 要求模型返回严格 JSON；解析/校验失败时自动携带错误信息请求修复重试。 */
  static async callJSON<T = unknown>(
    model: ModelConfig,
    prompt: string,
    options: JSONCallOptions<T> = {}
  ): Promise<JSONCallResult<T>> {
    if (!model) {
      return { raw: "", error: i18n.t('errors:noValidModel') };
    }
    return callJSON<T>(model, prompt, options);
  }

  static async testConnection(model: ModelConfig): Promise<string> {
    const response = await this.call(model, "你好，请回复'连接成功'。");

    if (response.error) {
      return `[ERROR] ${response.error}`;
    }

    // 检查响应内容是否包含预期的连接成功消息
    const content = response.content || '';
    if (content.includes("连接成功") || content.includes("success") || content.includes("Success")) {
      return `[SUCCESS] ${i18n.t('errors:connSuccess', { model: response.model || model.modelName, response: content })}`;
    } else {
      return `[INFO] ${i18n.t('errors:connInfo', { model: response.model || model.modelName, response: content })}`;
    }
  }

  /**
   * 流式调用：onChunk 的 content 为累计值，完成时 isComplete=true。
   * 不支持流式的配置自动降级为传统模式（提示放在 notice 而非 error，内容有效）。
   */
  static async callStreaming(
    model: ModelConfig,
    prompt: string,
    onChunk: StreamingCallback,
    options?: CallOptions
  ): Promise<void> {
    if (!model) {
      onChunk({
        content: "",
        error: i18n.t('errors:noValidModel'),
        isComplete: true
      });
      return;
    }

    const adapter = resolveAdapter(model);
    const streamingSupported = model.supportsStreaming !== false && adapter.supportsStreaming(model);

    if (!streamingSupported) {
      const response = await adapter.complete(model, prompt, options);
      onChunk({
        ...response,
        isComplete: true,
        isStreaming: false,
        notice: response.error
          ? undefined
          : i18n.t('errors:streamingUnsupported')
      });
      return;
    }

    await adapter.stream(model, prompt, onChunk, options);
  }
}
