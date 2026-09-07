/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 分区 → 功能 id 映射单源（design/04 §7 dogfooding）。
 * 导航可见性（WorkspaceNav）与不可用回退（App）共用，改一处即全局生效。
 * structure 取 chapters（outline 随包同进退）；structure 可见性取二者并集。
 */
import type { SectionId } from './app-shell/WorkspaceNav';

export const SECTION_FEATURE: Record<SectionId, string> = {
  inspiration: 'core.inspiration',
  world: 'core.world',
  characters: 'core.characters',
  structure: 'core.chapters',
  writing: 'core.writing',
};

/** 分区在当前发行档下是否可见（structure 任一子功能可用即显示）。 */
export function isSectionVisible(section: SectionId, has: (featureId: string) => boolean): boolean {
  if (section === 'structure') {
    return has('core.chapters') || has('core.outline');
  }
  return has(SECTION_FEATURE[section]);
}
