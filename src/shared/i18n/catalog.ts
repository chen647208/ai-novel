/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 跨进程共享的 i18n 数据目录：语言清单、中英字典与语言归一化。
 * 渲染进程（react-i18next 实例）与主进程（网关错误文案）都以此为唯一事实来源；
 * 字典为静态打包（离线桌面应用，规避 Electron file:// 动态分块）。
 */
import type { AppLanguage } from '../types.js';

import zhCommon from './locales/zh/common.json' with { type: 'json' };
import zhSettings from './locales/zh/settings.json' with { type: 'json' };
import zhNav from './locales/zh/nav.json' with { type: 'json' };
import zhApp from './locales/zh/app.json' with { type: 'json' };
import zhErrors from './locales/zh/errors.json' with { type: 'json' };
import zhProviders from './locales/zh/providers.json' with { type: 'json' };
import zhBooks from './locales/zh/books.json' with { type: 'json' };
import zhVersion from './locales/zh/version.json' with { type: 'json' };
import zhTimeline from './locales/zh/timeline.json' with { type: 'json' };
import zhForeshadow from './locales/zh/foreshadow.json' with { type: 'json' };
import zhSteps from './locales/zh/steps.json' with { type: 'json' };
import zhCharacters from './locales/zh/characters.json' with { type: 'json' };
import zhWorld from './locales/zh/world.json' with { type: 'json' };
import zhConsistency from './locales/zh/consistency.json' with { type: 'json' };
import zhKnowledge from './locales/zh/knowledge.json' with { type: 'json' };
import zhWriting from './locales/zh/writing.json' with { type: 'json' };
import zhAssistant from './locales/zh/assistant.json' with { type: 'json' };
import zhCards from './locales/zh/cards.json' with { type: 'json' };
import zhPrompts from './locales/zh/prompts.json' with { type: 'json' };
import enCommon from './locales/en/common.json' with { type: 'json' };
import enSettings from './locales/en/settings.json' with { type: 'json' };
import enNav from './locales/en/nav.json' with { type: 'json' };
import enApp from './locales/en/app.json' with { type: 'json' };
import enErrors from './locales/en/errors.json' with { type: 'json' };
import enProviders from './locales/en/providers.json' with { type: 'json' };
import enBooks from './locales/en/books.json' with { type: 'json' };
import enVersion from './locales/en/version.json' with { type: 'json' };
import enTimeline from './locales/en/timeline.json' with { type: 'json' };
import enForeshadow from './locales/en/foreshadow.json' with { type: 'json' };
import enSteps from './locales/en/steps.json' with { type: 'json' };
import enCharacters from './locales/en/characters.json' with { type: 'json' };
import enWorld from './locales/en/world.json' with { type: 'json' };
import enConsistency from './locales/en/consistency.json' with { type: 'json' };
import enKnowledge from './locales/en/knowledge.json' with { type: 'json' };
import enWriting from './locales/en/writing.json' with { type: 'json' };
import enAssistant from './locales/en/assistant.json' with { type: 'json' };
import enCards from './locales/en/cards.json' with { type: 'json' };
import enPrompts from './locales/en/prompts.json' with { type: 'json' };

/** 支持的语言。新增语言时在此扩展并补一份对应字典。 */
export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['zh', 'en'];
/** 兜底语言：检测失败或语言不受支持时回退。 */
export const DEFAULT_LANGUAGE: AppLanguage = 'zh';
/** 命名空间清单，随功能迁移逐步扩充。 */
export const NAMESPACES = ['common', 'settings', 'nav', 'app', 'errors', 'providers', 'books', 'version', 'timeline', 'foreshadow', 'steps', 'characters', 'world', 'consistency', 'knowledge', 'writing', 'assistant', 'cards', 'prompts'] as const;

/** 中英字典静态打包。 */
export const resources = {
  zh: { common: zhCommon, settings: zhSettings, nav: zhNav, app: zhApp, errors: zhErrors, providers: zhProviders, books: zhBooks, version: zhVersion, timeline: zhTimeline, foreshadow: zhForeshadow, steps: zhSteps, characters: zhCharacters, world: zhWorld, consistency: zhConsistency, knowledge: zhKnowledge, writing: zhWriting, assistant: zhAssistant, cards: zhCards, prompts: zhPrompts },
  en: { common: enCommon, settings: enSettings, nav: enNav, app: enApp, errors: enErrors, providers: enProviders, books: enBooks, version: enVersion, timeline: enTimeline, foreshadow: enForeshadow, steps: enSteps, characters: enCharacters, world: enWorld, consistency: enConsistency, knowledge: enKnowledge, writing: enWriting, assistant: enAssistant, cards: enCards, prompts: enPrompts },
} as const;

/** 把任意 navigator/字符串语言标签归一化为受支持的 AppLanguage。 */
export function normalizeLanguage(raw: string | undefined | null): AppLanguage | undefined {
  if (!raw) return undefined;
  const base = raw.toLowerCase().split('-')[0] ?? '';
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base)
    ? (base as AppLanguage)
    : undefined;
}
