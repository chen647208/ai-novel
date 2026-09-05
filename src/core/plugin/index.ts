/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 插件系统出口（docs/design/04）：manifest 校验 + 运行时。 */
export {
  validateManifest,
  shortId,
  commandId,
  typeTemplateId,
  eventDomain,
  settingKey,
  assertPermission,
  PermissionDenied,
  toPluginError,
  type Disposable,
  type PluginError,
  type PluginPhase,
  type PluginManifest,
  type PluginPermissions,
  type PluginContribution,
  type ManifestIssue,
  type ManifestValidateResult,
} from './manifest.js';
export {
  EventBus,
  type SeamName,
  type SeamPolicy,
  type VetoResult,
  type ObserveHandler,
  type InterceptHandler,
} from './events.js';
export {
  installHooks,
  installTypeTemplates,
  BuildProfileRegistry,
  type BuildProfile,
  type HookDeclaration,
} from './contributions.js';
export {
  PluginHost,
  type PluginState,
  type PluginStatus,
  type DiscoveredPlugin,
  type ContributionInstaller,
  type PluginHostOptions,
} from './runtime.js';
