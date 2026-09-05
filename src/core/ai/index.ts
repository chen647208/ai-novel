/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** core/ai 编排层出口（docs/design/05 §1）：prompt 装配器 + 内置 sections。 */
export {
  PromptAssembler,
  truncateText,
  type PromptContext,
  type PromptSection,
  type AssembleResult,
} from './promptAssembler.js';
export {
  registerBuiltinSections,
  renderWorldDigest,
  renderIndexDigest,
  identitySection,
  bookMetaSection,
  worldDigestSection,
  indexDigestSection,
  activeSkillSection,
  toolSchemasSection,
  userTaskSection,
  type WorldDigestOptions,
} from './builtinSections.js';
