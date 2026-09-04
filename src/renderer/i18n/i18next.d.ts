/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import 'i18next';
import type zhCommon from './locales/zh/common.json';
import type zhSettings from './locales/zh/settings.json';
import type zhNav from './locales/zh/nav.json';
import type zhApp from './locales/zh/app.json';
import type zhErrors from './locales/zh/errors.json';
import type zhBooks from './locales/zh/books.json';
import type zhVersion from './locales/zh/version.json';
import type zhTimeline from './locales/zh/timeline.json';
import type zhForeshadow from './locales/zh/foreshadow.json';
import type zhSteps from './locales/zh/steps.json';
import type zhCharacters from './locales/zh/characters.json';
import type zhWorld from './locales/zh/world.json';
import type zhConsistency from './locales/zh/consistency.json';
import type zhKnowledge from './locales/zh/knowledge.json';
import type zhWriting from './locales/zh/writing.json';
import type zhAssistant from './locales/zh/assistant.json';
import type zhCards from './locales/zh/cards.json';

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
    };
  }
}
