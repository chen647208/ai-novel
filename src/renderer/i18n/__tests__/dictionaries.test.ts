/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { describe, it, expect } from 'vitest';
import zhCommon from '../locales/zh/common.json';
import zhSettings from '../locales/zh/settings.json';
import zhNav from '../locales/zh/nav.json';
import zhApp from '../locales/zh/app.json';
import zhErrors from '../locales/zh/errors.json';
import zhProviders from '../locales/zh/providers.json';
import zhBooks from '../locales/zh/books.json';
import zhVersion from '../locales/zh/version.json';
import zhTimeline from '../locales/zh/timeline.json';
import zhForeshadow from '../locales/zh/foreshadow.json';
import zhSteps from '../locales/zh/steps.json';
import enCommon from '../locales/en/common.json';
import enSettings from '../locales/en/settings.json';
import enNav from '../locales/en/nav.json';
import enApp from '../locales/en/app.json';
import enErrors from '../locales/en/errors.json';
import enProviders from '../locales/en/providers.json';
import enBooks from '../locales/en/books.json';
import enVersion from '../locales/en/version.json';
import enTimeline from '../locales/en/timeline.json';
import enForeshadow from '../locales/en/foreshadow.json';
import enSteps from '../locales/en/steps.json';
import zhCharacters from '../locales/zh/characters.json';
import enCharacters from '../locales/en/characters.json';
import zhWorld from '../locales/zh/world.json';
import enWorld from '../locales/en/world.json';
import zhConsistency from '../locales/zh/consistency.json';
import enConsistency from '../locales/en/consistency.json';
import zhKnowledge from '../locales/zh/knowledge.json';
import enKnowledge from '../locales/en/knowledge.json';
import zhWriting from '../locales/zh/writing.json';
import enWriting from '../locales/en/writing.json';
import zhAssistant from '../locales/zh/assistant.json';
import enAssistant from '../locales/en/assistant.json';
import zhCards from '../locales/zh/cards.json';
import enCards from '../locales/en/cards.json';
import zhPrompts from '../locales/zh/prompts.json';
import enPrompts from '../locales/en/prompts.json';

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
