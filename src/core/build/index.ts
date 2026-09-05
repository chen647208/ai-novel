/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 构建管线出口（docs/design/07）：profile + select/transform/render。 */
export {
  DEFAULT_BUILD_PROFILE,
  COMPENDIUM_BUILD_PROFILE,
  roundtripProfile,
  serializeProfileYaml,
  parseProfileYaml,
  typeMatches,
  type BuildProfile,
  type BuildSelection,
  type BuildTransform,
  type BuildRender,
} from './profile.js';
export {
  select,
  transform,
  renderDoc,
  runBuild,
  registerTransformer,
  listTransformers,
  registerRenderer,
  listRenderers,
  type SelectedNode,
  type DocBlock,
  type Transformer,
  type Renderer,
} from './pipeline.js';
