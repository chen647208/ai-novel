/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 用户写法技能（docs/design/05 §3 发现层级之“用户目录”）。
 * 存放：<userData>/skills/user/<slug>/SKILL.md；SKILL.md 是数据不是代码，
 * 导入即校验 frontmatter 并注册进会话技能目录，会话启动按清单渐进注入。
 */

import { parseSkillMd, type Skill } from '@core/ai';

import { logger } from '@/shared/utils/logger';

import { skillCatalog } from './aiRuntime';

const USER_SKILLS_DIR = 'skills/user';

export interface UserSkillInfo {
  /** 目录 slug（删除用） */
  slug: string;
  name: string;
  description: string;
}

type ElectronAPI = NonNullable<Window['electronAPI']>;

function api(): ElectronAPI | undefined {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
}

/** slug 化：只保留字母/数字/连字符，避免路径穿越。 */
export function skillSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'skill';
}

async function userDir(): Promise<string | undefined> {
  const a = api();
  if (!a) return undefined;
  const base = await a.getAppDataPath();
  return `${base}/${USER_SKILLS_DIR}`;
}

/** 从磁盘列出用户技能（解析失败的目录跳过）。 */
export async function listUserSkills(): Promise<UserSkillInfo[]> {
  const a = api();
  const dir = await userDir();
  if (!a || !dir) return [];
  const entries = await a.listDirectory(dir).catch(() => []);
  const out: UserSkillInfo[] = [];
  for (const entry of entries) {
    if (entry.type !== 'directory') continue;
    const md = await a.readFile(`${dir}/${entry.name}/SKILL.md`).catch(() => '');
    if (!md) continue;
    const parsed = parseSkillMd(md, 'user', `${entry.name}/SKILL.md`);
    if (parsed.skill) out.push({ slug: entry.name, name: parsed.skill.name, description: parsed.skill.description });
  }
  return out;
}

/** 内置技能（来自当前会话目录）。 */
export function listBuiltinSkills(): Array<Pick<Skill, 'name' | 'description'>> {
  return skillCatalog.list().filter((s) => s.source === 'builtin').map((s) => ({ name: s.name, description: s.description }));
}

/** 导入技能：校验 → 落盘 → 注册（会话内即时可用）。 */
export async function importUserSkill(md: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseSkillMd(md, 'user', 'SKILL.md');
  if (parsed.error || !parsed.skill) {
    return { ok: false, error: parsed.error?.reason ?? '解析失败' };
  }
  const a = api();
  const dir = await userDir();
  if (!a || !dir) return { ok: false, error: 'no-electron' };
  const slug = skillSlug(parsed.skill.name);
  await a.writeFile(`${dir}/${slug}/SKILL.md`, md);
  skillCatalog.registerParsed([{ md, source: 'user', sourceFile: `${slug}/SKILL.md` }]);
  return { ok: true };
}

/** 删除用户技能：移除文件并注销（会话内即时失效）。 */
export async function deleteUserSkill(slug: string, name: string): Promise<void> {
  const a = api();
  const dir = await userDir();
  if (!a || !dir) return;
  await a.unlink(`${dir}/${slug}/SKILL.md`).catch(() => {});
  skillCatalog.unregister(name);
}

/** 启动装载：把用户目录里的技能注册进当前会话目录（失败不挡启动）。 */
export async function loadUserSkills(): Promise<void> {
  try {
    const a = api();
    const dir = await userDir();
    if (!a || !dir) return;
    const entries = await a.listDirectory(dir).catch(() => []);
    for (const entry of entries) {
      if (entry.type !== 'directory') continue;
      const md = await a.readFile(`${dir}/${entry.name}/SKILL.md`).catch(() => '');
      if (!md) continue;
      skillCatalog.registerParsed([{ md, source: 'user', sourceFile: `${entry.name}/SKILL.md` }]);
    }
  } catch (err) {
    logger.warn('用户技能装载失败:', err);
  }
}
