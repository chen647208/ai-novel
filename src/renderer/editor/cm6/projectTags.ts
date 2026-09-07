/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 从（旧版）Project 汇总可被大纲引用的标签集：人物 / 地点 / 势力名。
 * 供 DslEditor 的 @tag 校验与 [[链接]] 补全使用。
 * 新实体模型下应改由索引器 tags 提供，这里保持纯函数、零依赖便于单测。
 */
import type { Project } from '../../../shared/types';

export function collectProjectTags(project: Project): Set<string> {
  const tags = new Set<string>();
  for (const c of project.characters ?? []) if (c.name) tags.add(c.name);
  for (const l of project.locations ?? []) if (l.name) tags.add(l.name);
  for (const f of project.factions ?? []) if (f.name) tags.add(f.name);
  return tags;
}
