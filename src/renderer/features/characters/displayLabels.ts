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
 * 角色档案中 role/gender 存储的是中文数据值（与 CharacterModal 的 option value 一致，
 * 且由 AI 解析生成），显示时把已知枚举值映射到 characters 命名空间译文，
 * 自由文本（如 AI 给出的「亦正亦邪」）原样展示。
 */
const ROLE_KEYS: Record<string, string> = {
  '主角': 'characters:modal.roleOptions.protagonist',
  '反派': 'characters:modal.roleOptions.antagonist',
  '配角': 'characters:modal.roleOptions.supporting',
  '其他': 'characters:modal.roleOptions.other',
};

const GENDER_KEYS: Record<string, string> = {
  '男': 'characters:modal.genderOptions.male',
  '女': 'characters:modal.genderOptions.female',
  '其他': 'characters:modal.genderOptions.other',
  '未知': 'characters:modal.genderOptions.unknown',
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
