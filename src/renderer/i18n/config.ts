/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { DEFAULT_LANGUAGE, NAMESPACES, normalizeLanguage,resources, SUPPORTED_LANGUAGES } from '@shared/i18n/catalog';
import type { AppLanguage } from '@shared/types';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// 语言清单、字典与归一化逻辑在 src/shared/i18n/catalog（主进程网关同样消费），此处只维护渲染端实例。
export { DEFAULT_LANGUAGE, NAMESPACES, normalizeLanguage,resources, SUPPORTED_LANGUAGES };

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

/** 把语言写到 <html lang>（无障碍与浏览器行为依赖它）。 */
function applyHtmlLang(lang: AppLanguage): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }
}

/** 切换运行时语言（不直接落盘；持久化由调用方写入 AppState 完成）。 */
export function changeLanguage(lang: AppLanguage): void {
  void i18n.changeLanguage(lang);
  applyHtmlLang(lang);
}

/** 首帧按检测到的语言同步 <html lang>（bootstrap 调用）。 */
export function syncHtmlLang(): void {
  applyHtmlLang(getEffectiveLanguage());
}

export { i18n };
