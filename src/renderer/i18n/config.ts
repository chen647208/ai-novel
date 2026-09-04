/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import type { AppLanguage } from '@shared/types';
import zhCommon from './locales/zh/common.json';
import zhSettings from './locales/zh/settings.json';
import zhNav from './locales/zh/nav.json';
import zhApp from './locales/zh/app.json';
import zhErrors from './locales/zh/errors.json';
import zhProviders from './locales/zh/providers.json';
import zhBooks from './locales/zh/books.json';
import zhVersion from './locales/zh/version.json';
import zhTimeline from './locales/zh/timeline.json';
import zhForeshadow from './locales/zh/foreshadow.json';
import zhSteps from './locales/zh/steps.json';
import zhCharacters from './locales/zh/characters.json';
import zhWorld from './locales/zh/world.json';
import zhConsistency from './locales/zh/consistency.json';
import zhKnowledge from './locales/zh/knowledge.json';
import zhWriting from './locales/zh/writing.json';
import zhAssistant from './locales/zh/assistant.json';
import zhCards from './locales/zh/cards.json';
import zhPrompts from './locales/zh/prompts.json';
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enNav from './locales/en/nav.json';
import enApp from './locales/en/app.json';
import enErrors from './locales/en/errors.json';
import enProviders from './locales/en/providers.json';
import enBooks from './locales/en/books.json';
import enVersion from './locales/en/version.json';
import enTimeline from './locales/en/timeline.json';
import enForeshadow from './locales/en/foreshadow.json';
import enSteps from './locales/en/steps.json';
import enCharacters from './locales/en/characters.json';
import enWorld from './locales/en/world.json';
import enConsistency from './locales/en/consistency.json';
import enKnowledge from './locales/en/knowledge.json';
import enWriting from './locales/en/writing.json';
import enAssistant from './locales/en/assistant.json';
import enCards from './locales/en/cards.json';
import enPrompts from './locales/en/prompts.json';

/** 支持的语言。新增语言时在此扩展并补一份对应字典。 */
export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['zh', 'en'];
/** 兜底语言：检测失败或语言不受支持时回退。 */
export const DEFAULT_LANGUAGE: AppLanguage = 'zh';
/** 命名空间清单，随功能迁移逐步扩充。 */
export const NAMESPACES = ['common', 'settings', 'nav', 'app', 'errors', 'providers', 'books', 'version', 'timeline', 'foreshadow', 'steps', 'characters', 'world', 'consistency', 'knowledge', 'writing', 'assistant', 'cards', 'prompts'] as const;

/** 中英字典静态打包（离线桌面应用，规避 Electron file:// 动态分块）。 */
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

let initialized = false;

/**
 * 初始化 i18next。传入 initialLanguage 时以其为准（如已持久化的用户选择），
 * 否则交由语言检测器读取 navigator。幂等：重复调用只生效一次。
 */
export async function initI18n(initialLanguage?: AppLanguage): Promise<typeof i18n> {
  if (initialized) return i18n;
  await i18n.use(LanguageDetector).use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: false,
    load: 'languageOnly',
    defaultNS: 'common',
    ns: [...NAMESPACES],
    detection: { order: ['navigator'], caches: [] },
    // React 以文本节点渲染所有译文，已负责转义；i18next 再转义会对插值内容（如含 & 的书名）二次转义。
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  initialized = true;
  return i18n;
}

/** 当前生效语言（归一化到受支持集合）。 */
export function getEffectiveLanguage(): AppLanguage {
  return normalizeLanguage(i18n.language) ?? DEFAULT_LANGUAGE;
}

/** 切换运行时语言（不直接落盘；持久化由调用方写入 AppState 完成）。 */
export function changeLanguage(lang: AppLanguage): void {
  void i18n.changeLanguage(lang);
}

export { i18n };
