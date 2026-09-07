/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import zhCommon from '../../../shared/i18n/locales/zh/common.json';
import zhSettings from '../../../shared/i18n/locales/zh/settings.json';
import zhNav from '../../../shared/i18n/locales/zh/nav.json';
import zhApp from '../../../shared/i18n/locales/zh/app.json';
import zhErrors from '../../../shared/i18n/locales/zh/errors.json';
import zhProviders from '../../../shared/i18n/locales/zh/providers.json';
import zhBooks from '../../../shared/i18n/locales/zh/books.json';
import zhVersion from '../../../shared/i18n/locales/zh/version.json';
import zhTimeline from '../../../shared/i18n/locales/zh/timeline.json';
import zhForeshadow from '../../../shared/i18n/locales/zh/foreshadow.json';
import zhSteps from '../../../shared/i18n/locales/zh/steps.json';
import enCommon from '../../../shared/i18n/locales/en/common.json';
import enSettings from '../../../shared/i18n/locales/en/settings.json';
import enNav from '../../../shared/i18n/locales/en/nav.json';
import enApp from '../../../shared/i18n/locales/en/app.json';
import enErrors from '../../../shared/i18n/locales/en/errors.json';
import enProviders from '../../../shared/i18n/locales/en/providers.json';
import enBooks from '../../../shared/i18n/locales/en/books.json';
import enVersion from '../../../shared/i18n/locales/en/version.json';
import enTimeline from '../../../shared/i18n/locales/en/timeline.json';
import enForeshadow from '../../../shared/i18n/locales/en/foreshadow.json';
import enSteps from '../../../shared/i18n/locales/en/steps.json';
import zhCharacters from '../../../shared/i18n/locales/zh/characters.json';
import enCharacters from '../../../shared/i18n/locales/en/characters.json';
import zhWorld from '../../../shared/i18n/locales/zh/world.json';
import enWorld from '../../../shared/i18n/locales/en/world.json';
import zhConsistency from '../../../shared/i18n/locales/zh/consistency.json';
import enConsistency from '../../../shared/i18n/locales/en/consistency.json';
import zhKnowledge from '../../../shared/i18n/locales/zh/knowledge.json';
import enKnowledge from '../../../shared/i18n/locales/en/knowledge.json';
import zhWriting from '../../../shared/i18n/locales/zh/writing.json';
import enWriting from '../../../shared/i18n/locales/en/writing.json';
import zhAssistant from '../../../shared/i18n/locales/zh/assistant.json';
import enAssistant from '../../../shared/i18n/locales/en/assistant.json';
import zhCards from '../../../shared/i18n/locales/zh/cards.json';
import enCards from '../../../shared/i18n/locales/en/cards.json';
import zhPrompts from '../../../shared/i18n/locales/zh/prompts.json';
import enPrompts from '../../../shared/i18n/locales/en/prompts.json';
import zhOnboarding from '../../../shared/i18n/locales/zh/onboarding.json';
import enOnboarding from '../../../shared/i18n/locales/en/onboarding.json';

/** 把嵌套字典扁平化为「点号键 → 字符串值」。 */
function flatten(obj: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (o: unknown, p: string): void => {
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        walk(v, p ? `${p}.${k}` : k);
      }
    } else {
      out.set(p, typeof o === 'string' ? o : JSON.stringify(o));
    }
  };
  walk(obj, prefix);
  return out;
}

/** 提取 {{param}} 占位符名集合（复数变体归并到同名）。 */
function paramTokens(s: string): string[] {
  return [...s.matchAll(/\{\{\s*(\w+)/g)].map((m) => m[1]!).sort();
}

const NAMESPACES: Array<{ ns: string; zh: unknown; en: unknown }> = [
  { ns: 'common', zh: zhCommon, en: enCommon },
  { ns: 'settings', zh: zhSettings, en: enSettings },
  { ns: 'nav', zh: zhNav, en: enNav },
  { ns: 'app', zh: zhApp, en: enApp },
  { ns: 'errors', zh: zhErrors, en: enErrors },
  { ns: 'providers', zh: zhProviders, en: enProviders },
  { ns: 'books', zh: zhBooks, en: enBooks },
  { ns: 'version', zh: zhVersion, en: enVersion },
  { ns: 'timeline', zh: zhTimeline, en: enTimeline },
  { ns: 'foreshadow', zh: zhForeshadow, en: enForeshadow },
  { ns: 'steps', zh: zhSteps, en: enSteps },
  { ns: 'characters', zh: zhCharacters, en: enCharacters },
  { ns: 'world', zh: zhWorld, en: enWorld },
  { ns: 'consistency', zh: zhConsistency, en: enConsistency },
  { ns: 'knowledge', zh: zhKnowledge, en: enKnowledge },
  { ns: 'writing', zh: zhWriting, en: enWriting },
  { ns: 'assistant', zh: zhAssistant, en: enAssistant },
  { ns: 'cards', zh: zhCards, en: enCards },
  { ns: 'prompts', zh: zhPrompts, en: enPrompts },
  { ns: 'onboarding', zh: zhOnboarding, en: enOnboarding },
];

describe('中英字典一致性', () => {
  for (const { ns, zh, en } of NAMESPACES) {
    it(`${ns}: zh 与 en 键集完全一致`, () => {
      expect([...flatten(en).keys()].sort()).toEqual([...flatten(zh).keys()].sort());
    });

    it(`${ns}: 无空值`, () => {
      for (const [k, v] of flatten(zh)) expect(v.trim(), `${ns}.${k} (zh) 为空`).not.toBe('');
      for (const [k, v] of flatten(en)) expect(v.trim(), `${ns}.${k} (en) 为空`).not.toBe('');
    });

    it(`${ns}: 同名键的占位符集合一致`, () => {
      const z = flatten(zh);
      const e = flatten(en);
      for (const k of z.keys()) {
        expect(paramTokens(e.get(k) ?? ''), `${ns}.${k} 占位符不匹配`).toEqual(paramTokens(z.get(k) ?? ''));
      }
    });
  }
});
