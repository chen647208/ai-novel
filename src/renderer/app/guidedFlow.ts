/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 引导流（UI 宪法 §3.3「无模式」的折中）：根据项目完成度建议「下一步」分区。
 * 纯建议、可跳过、可关闭——引导是可选轨道不是牢笼。
 */
import type { Project } from '../../shared/types';
import type { SectionId } from './app-shell/WorkspaceNav';

/** 灵感→角色→世界→结构（大纲/细纲一页）→写作：返回第一个尚未填充的分区；全部就绪则进写作。 */
export function suggestNextSection(project: Project | null): SectionId {
  if (!project) return 'inspiration';
  if (!project.inspiration?.trim() && !project.intro?.trim()) return 'inspiration';
  if (!project.characters?.length) return 'characters';
  if (!(project.knowledge?.length ?? 0) && !project.worldView) return 'world';
  if (!project.outline?.trim() || !project.chapters?.length) return 'structure';
  return 'writing';
}
