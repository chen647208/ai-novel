/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 会话历史装配（从 GlobalAssistant 抽出）：
 * 报错消息剔除 → 摘要置顶 → 旧轮在前；超阈值先压缩最旧一半，失败降级硬截断。
 */
import { useCallback } from 'react';
import type { ModelConfig } from '../../../../shared/types';
import { i18n } from '@/i18n';
import { AIService } from '@/shared/services/ai/aiService';
import { SUMMARY_MAX_CHARS } from '../../../../shared/constants/chat';
import { needsCompaction, splitForCompaction, type ChatTurn } from '../services/chatHistory';
import type { ChatMessage } from '../types';

interface UseAssistantHistoryArgs {
  messages: ChatMessage[];
  historySummary: string;
  setHistorySummary: (summary: string) => void;
}

export function useAssistantHistory({ messages, historySummary, setHistorySummary }: UseAssistantHistoryArgs): {
  buildHistoryTurns: (model: ModelConfig) => Promise<ChatTurn[]>;
} {
  const buildHistoryTurns = useCallback(async (model: ModelConfig): Promise<ChatTurn[]> => {
    const turns: ChatTurn[] = [];
    if (historySummary.trim()) {
      turns.push({ role: 'assistant', content: `[此前对话摘要]${historySummary.trim()}` });
    }
    for (const m of messages) {
      if (m.error || !m.content?.trim()) continue;
      turns.push({ role: m.role, content: m.content });
    }
    const raw = turns.map((t) => t.content).join('\n');
    if (!needsCompaction(raw) || turns.length === 0) return turns;
    const { old, recent } = splitForCompaction(turns);
    try {
      const prompt = i18n.language.startsWith('en')
        ? `Summarize the following earlier conversation in under 400 words: topics discussed, confirmed facts (names/settings/decisions), open questions. Summary only, no pleasantries.\n\n${old.map((t) => `${t.role}: ${t.content}`).join('\n')}`
        : `把以下此前对话压缩成400字以内摘要：谈了哪几个话题、已确认的关键事实（人名/设定/决定）、未解决的问题。只要摘要，不要寒暄。\n\n${old.map((t) => `${t.role}: ${t.content}`).join('\n')}`;
      const res = await AIService.call(model, prompt);
      const summary = (res.content ?? '').trim().slice(0, SUMMARY_MAX_CHARS);
      if (summary) {
        setHistorySummary(summary);
        return [{ role: 'assistant', content: `[此前对话摘要]${summary}` }, ...recent];
      }
    } catch {
      // 摘要失败走降级：buildHistoryText 的三档截断兜底
    }
    return turns;
  }, [messages, historySummary, setHistorySummary]);

  return { buildHistoryTurns };
}
