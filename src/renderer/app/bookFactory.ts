/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 书籍构造纯函数：空白书、清空内容、深拷贝、示例书。
 * 与 store/仓库解耦（只依赖类型与 i18n），便于单测覆盖字段完整性。
 */
import { type Character, type CharacterGenderId, type CharacterRoleId, type Project } from '../../shared/types';
import { i18n } from '../i18n';

/** 新建空白书（可带简介）。 */
export const emptyBook = (title: string, intro = ''): Project => ({
  id: Date.now().toString(),
  title,
  inspiration: '',
  intro,
  characters: [],
  outline: '',
  chapters: [],
  virtualChapters: [],
  knowledge: [],
  lastModified: Date.now(),
});

/** 清空项目时一并重置的内容字段（与 Project 设定字段一一对应，漏一个即重置不净）。 */
export function blankContents(): Partial<Project> {
  return {
    inspiration: '', intro: '', characters: [], outline: '', chapters: [],
    virtualChapters: [], knowledge: [],
    worldView: undefined, locations: undefined, factions: undefined,
    timeline: undefined, ruleSystems: undefined, foreshadows: undefined,
  };
}

/** 深拷贝整本书（含世界观/地点/势力/时间线/规则/伏笔），换新 id 与标题；不共享嵌套引用。 */
export function cloneProject(source: Project, title: string, intro?: string): Project {
  const clone = structuredClone(source);
  clone.id = Date.now().toString();
  clone.title = title;
  if (intro !== undefined) clone.intro = intro;
  clone.lastModified = Date.now();
  return clone;
}

/** 示例书 i18n 键集合（联合类型让 i18n.t 通过类型检查，杜绝拼错键）。 */
type ExampleKey =
  | 'intro' | 'outline' | 'worldName' | 'worldDesc' | 'rule1' | 'rule2' | 'limitation' | 'casting'
  | 'char1Name' | 'char1Personality' | 'char1Background' | 'char1Occupation' | 'char1Motivation'
  | 'char2Name' | 'char2Personality' | 'char2Background' | 'char2Occupation' | 'char2Motivation'
  | 'chapter1Title' | 'chapter1Summary' | 'chapter2Title' | 'chapter2Summary';

/** 示例书：真实预设结构（世界观/两个角色/两章大纲），内容取自 i18n，与界面语言一致。 */
export function buildExampleProject(title: string, intro: string): Project {
  const t = (key: ExampleKey): string => i18n.t(`books:example.${key}`);
  const now = Date.now();
  const id = now.toString();
  const mkChar = (
    prefix: 'char1' | 'char2',
    role: CharacterRoleId,
    gender: CharacterGenderId,
  ): Character => {
    const field = (suffix: 'Name' | 'Personality' | 'Background' | 'Occupation' | 'Motivation'): string =>
      t(`${prefix}${suffix}` as ExampleKey);
    return {
      id: `${id}-${prefix}`,
      name: field('Name'),
      gender,
      age: '',
      role,
      personality: field('Personality'),
      background: field('Background'),
      relationships: '',
      appearance: '',
      distinctiveFeatures: '',
      occupation: field('Occupation'),
      motivation: field('Motivation'),
      strengths: '',
      weaknesses: '',
      characterArc: '',
    };
  };
  return {
    id,
    title,
    inspiration: '',
    intro,
    characters: [mkChar('char1', 'protagonist', 'male'), mkChar('char2', 'supporting', 'female')],
    outline: t('outline'),
    chapters: [1, 2].map((n) => ({
      id: `${id}-ch${n}`,
      title: t(`chapter${n}Title` as ExampleKey),
      summary: t(`chapter${n}Summary` as ExampleKey),
      content: '',
      order: n,
      status: 'draft' as const,
    })),
    virtualChapters: [],
    knowledge: [],
    worldView: {
      id: `${id}-world`,
      projectId: id,
      magicSystem: {
        name: t('worldName'),
        description: t('worldDesc'),
        rules: [t('rule1'), t('rule2')],
        limitations: t('limitation'),
        castingMethod: t('casting'),
      },
      createdAt: now,
      updatedAt: now,
    },
    lastModified: now,
  };
}
