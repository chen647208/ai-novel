/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 工作台分区单源：标识、图标、标签键、完成判定。
 * 导航（WorkspaceNav）、顶栏（WorkspaceTopbar）、壳路由（App/WorkspaceView/guidedFlow）
 * 与功能映射（sectionFeatures）均引用此表，新增分区只改本文件 + WorkspaceView 内容分支。
 */
import { Feather, Globe, ListOrdered, PenLine, Users } from 'lucide-react';
import type React from 'react';

import type { Project } from '../../shared/types';

/** 工作台分区标识；大纲与细纲合并为 structure（一页两段），与旧线性向导解耦。 */
export type SectionId = 'inspiration' | 'world' | 'characters' | 'structure' | 'writing';

/** 分区标签的 i18n 键（字面量联合，满足 typed-i18n 校验）。 */
export type SectionLabelKey =
  | 'steps.inspiration'
  | 'steps.world'
  | 'steps.characters'
  | 'steps.structure'
  | 'steps.writing';

export interface SectionDef {
  id: SectionId;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: SectionLabelKey;
  /** 该分区所需的功能 id（任一可用即显示；发行档禁用后回退写作）。 */
  features: readonly string[];
  /** 分区是否已有内容（驱动完成状态点）。 */
  done: (p: Project) => boolean;
}

export const WORKSPACE_SECTIONS: readonly SectionDef[] = [
  { id: 'inspiration', icon: PenLine, labelKey: 'steps.inspiration', features: ['core.inspiration'], done: (p) => !!(p.inspiration || p.intro) },
  { id: 'world', icon: Globe, labelKey: 'steps.world', features: ['core.world'], done: (p) => (p.knowledge?.length ?? 0) > 0 || !!p.worldView },
  { id: 'characters', icon: Users, labelKey: 'steps.characters', features: ['core.characters'], done: (p) => p.characters.length > 0 },
  { id: 'structure', icon: ListOrdered, labelKey: 'steps.structure', features: ['core.chapters', 'core.outline'], done: (p) => !!p.outline || p.chapters.length > 0 },
  { id: 'writing', icon: Feather, labelKey: 'steps.writing', features: ['core.writing'], done: (p) => p.chapters.some((c) => !!c.content) },
];
