/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 人物/时间线枚举归一化（D4 数据层中文值改枚举）。
 *
 * 存储与比较只用英文枚举 id；中文仅出现在两个地方：
 * 1) 用户输入层（斜杠命令中英别名、AI 生成的中文文本）——在此归一化；
 * 2) 显示层（displayLabels + 字典）。
 * 老数据在 hydrateStoresFromState 入库时经 normalizeProjectKinds 归一化一次。
 */
import type {
  CharacterGenderId,
  CharacterRoleId,
  Project,
  TimelineImpactId,
} from '../../../shared/types';

/** AI 文本解析草稿：各字段先收原始文本，落库前归一化（role/gender 进枚举 id）。 */
export type CharacterDraft = Partial<Record<CharacterDraftField, string>>;

/** 草稿可写字段（解析循环的 currentField 取值范围，与 CharacterDraft 对齐）。 */
export type CharacterDraftField =
  | 'id' | 'name' | 'gender' | 'age' | 'role' | 'personality' | 'background'
  | 'relationships' | 'appearance' | 'distinctiveFeatures' | 'occupation'
  | 'motivation' | 'strengths' | 'weaknesses' | 'characterArc';

const ROLE_MAP: Record<string, CharacterRoleId> = {
  protagonist: 'protagonist',
  '主角': 'protagonist',
  antagonist: 'antagonist',
  villain: 'antagonist',
  '反派': 'antagonist',
  supporting: 'supporting',
  '配角': 'supporting',
  other: 'other',
  '其他': 'other',
};

const GENDER_MAP: Record<string, CharacterGenderId> = {
  male: 'male',
  '男': 'male',
  female: 'female',
  '女': 'female',
  other: 'other',
  '其他': 'other',
  unknown: 'unknown',
  '未知': 'unknown',
};

/** 角色定位归一化：已知中英映射到枚举，否则回退（AI 解析默认配角）。 */
export function normalizeRoleId(input: unknown, fallback: CharacterRoleId = 'supporting'): CharacterRoleId {
  if (typeof input !== 'string') return fallback;
  const key = input.trim().toLowerCase();
  if (!key) return fallback;
  return ROLE_MAP[key] ?? ROLE_MAP[input.trim()] ?? fallback;
}

/** 性别归一化：已知中英映射到枚举，否则回退未知。 */
export function normalizeGenderId(input: unknown, fallback: CharacterGenderId = 'unknown'): CharacterGenderId {
  if (typeof input !== 'string') return fallback;
  const key = input.trim().toLowerCase();
  if (!key) return fallback;
  return GENDER_MAP[key] ?? GENDER_MAP[input.trim()] ?? fallback;
}

/** 老时间线影响度文本归一化一次（之后过滤只读 significance 枚举）。 */
export function normalizeImpactId(input: unknown): TimelineImpactId {
  if (typeof input !== 'string') return 'minor';
  const text = input.toLowerCase();
  if (
    text.includes('重大') ||
    text.includes('关键') ||
    text.includes('重要') ||
    text.includes('major')
  ) {
    return 'major';
  }
  return 'minor';
}

/** 单个项目的数据枚举归一化（入库迁移：人物定位/性别、时间线重要度）。 */
export function normalizeProjectKinds(project: Project): Project {
  let changed = false;
  const characters = (project.characters ?? []).map((c) => {
    const role = normalizeRoleId(c.role);
    const gender = normalizeGenderId(c.gender);
    if (role === c.role && gender === c.gender) return c;
    changed = true;
    return { ...c, role, gender };
  });
  const timeline = project.timeline
    ? {
        ...project.timeline,
        events: (project.timeline.events ?? []).map((e) => {
          if (e.significance) return e;
          changed = true;
          return { ...e, significance: normalizeImpactId(e.impact) };
        }),
      }
    : project.timeline;
  if (!changed) return project;
  return { ...project, characters, timeline };
}
