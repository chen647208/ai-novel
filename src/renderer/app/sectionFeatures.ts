/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 分区可见性：功能 id 映射单源在 sections.ts 的 SectionDef.features。
 * 导航（WorkspaceNav）与不可用回退（App）共用，改一处即全局生效。
 */
import { type SectionId,WORKSPACE_SECTIONS } from './sections';

/** 分区在当前发行档下是否可见（所需功能任一可用即显示）。 */
export function isSectionVisible(section: SectionId, has: (featureId: string) => boolean): boolean {
  const def = WORKSPACE_SECTIONS.find((s) => s.id === section);
  return !!def && def.features.some(has);
}
