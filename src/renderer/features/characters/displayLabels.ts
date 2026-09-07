/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { dt } from '@/i18n';

/**
 * 角色/性别显示名助手。
 * 存储与比较只用枚举 id（normalizeRoleId/normalizeGenderId 归一化），
 * 显示时把枚举映射到 characters 命名空间译文；未知字符串原样展示
 * （过渡期兜底，不做中文匹配）。
 */
const ROLE_KEYS: Record<string, string> = {
  protagonist: 'characters:modal.roleOptions.protagonist',
  antagonist: 'characters:modal.roleOptions.antagonist',
  supporting: 'characters:modal.roleOptions.supporting',
  other: 'characters:modal.roleOptions.other',
};

const GENDER_KEYS: Record<string, string> = {
  male: 'characters:modal.genderOptions.male',
  female: 'characters:modal.genderOptions.female',
  other: 'characters:modal.genderOptions.other',
  unknown: 'characters:modal.genderOptions.unknown',
};

/** 角色类型显示名（按调用时语言）。 */
export function roleLabel(role: string | undefined | null): string {
  if (!role) return dt('characters:labels.unknown');
  const key = ROLE_KEYS[role];
  return key ? dt(key) : role;
}

/** 性别显示名（按调用时语言）。 */
export function genderLabel(gender: string | undefined | null): string {
  if (!gender) return dt('characters:labels.unknown');
  const key = GENDER_KEYS[gender];
  return key ? dt(key) : gender;
}
