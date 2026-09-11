/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import 'i18next';

import type zhApp from '../../shared/i18n/locales/zh/app.json';
import type zhAssistant from '../../shared/i18n/locales/zh/assistant.json';
import type zhBooks from '../../shared/i18n/locales/zh/books.json';
import type zhCards from '../../shared/i18n/locales/zh/cards.json';
import type zhCharacters from '../../shared/i18n/locales/zh/characters.json';
import type zhCommon from '../../shared/i18n/locales/zh/common.json';
import type zhConsistency from '../../shared/i18n/locales/zh/consistency.json';
import type zhErrors from '../../shared/i18n/locales/zh/errors.json';
import type zhForeshadow from '../../shared/i18n/locales/zh/foreshadow.json';
import type zhKnowledge from '../../shared/i18n/locales/zh/knowledge.json';
import type zhNav from '../../shared/i18n/locales/zh/nav.json';
import type zhOnboarding from '../../shared/i18n/locales/zh/onboarding.json';
import type zhSettings from '../../shared/i18n/locales/zh/settings.json';
import type zhSteps from '../../shared/i18n/locales/zh/steps.json';
import type zhTimeline from '../../shared/i18n/locales/zh/timeline.json';
import type zhVersion from '../../shared/i18n/locales/zh/version.json';
import type zhWorld from '../../shared/i18n/locales/zh/world.json';
import type zhWriting from '../../shared/i18n/locales/zh/writing.json';

/**
 * 类型化翻译键：以中文母版字典推导 resources 形状，使 t() 的键与命名空间在编译期受检、
 * 自动补全，杜绝错键。新增命名空间时在此登记（与 config.ts 的 resources 保持一致）。
 * 注：providers 命名空间为数据目录型（含数组、运行时组合键），经 dt()/dtList() 取词，
 * 不纳入类型化键，故此处不登记。version 命名空间的 UI 文案走类型化 t()，但其 changelog/history
 * 为数据目录（含点号版本键与数组），运行时经 dt() + returnObjects 取词，不作为类型化键引用。
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof zhCommon;
      settings: typeof zhSettings;
      nav: typeof zhNav;
      app: typeof zhApp;
      errors: typeof zhErrors;
      books: typeof zhBooks;
      version: typeof zhVersion;
      timeline: typeof zhTimeline;
      foreshadow: typeof zhForeshadow;
      steps: typeof zhSteps;
      characters: typeof zhCharacters;
      world: typeof zhWorld;
      consistency: typeof zhConsistency;
      knowledge: typeof zhKnowledge;
      writing: typeof zhWriting;
      assistant: typeof zhAssistant;
      cards: typeof zhCards;
      onboarding: typeof zhOnboarding;
    };
  }
}
