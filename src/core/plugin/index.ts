/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 插件系统出口（docs/design/04）：manifest 校验 + 运行时。 */
export type { BuildProfile } from '../build/profile.js';
export {
  enabledFeatureIds,
  isFeatureEnabled,
  PROFILE_CHANGED_EVENT,
  profileDeniesAi,
} from './availability.js';
export { BUILTIN_BUNDLE_MANIFESTS } from './builtin/manifests.js';
export {
  type AssemblyRow,
  assemblyTree,
  BUILTIN_BUNDLES,
  BUILTIN_FEATURES,
  type Bundle,
  DEFAULT_RELEASE_PROFILE,
  type FeatureDecl,
  type Profile,
  profileByName,
  RELEASE_PROFILES,
  type ReleaseProfileName,
} from './bundles.js';
export {
  createPluginContext,
  drainTasks,
  type PluginContext,
  type PluginContextOptions,
  registeredTasks,
  type TaskHandle,
} from './context.js';
export {
  buildProfileKey,
  BuildProfileRegistry,
  type HookDeclaration,
  installHooks,
  installTypeTemplates,
} from './contributions.js';
export {
  EventBus,
  type InterceptHandler,
  type ObserveHandler,
  type SeamName,
  type SeamPolicy,
  type VetoResult,
} from './events.js';
export {
  assertPermission,
  commandId,
  type Disposable,
  eventDomain,
  type ManifestIssue,
  type ManifestValidateResult,
  PermissionDenied,
  type PluginContribution,
  type PluginError,
  type PluginManifest,
  type PluginPermissions,
  type PluginPhase,
  settingKey,
  shortId,
  toPluginError,
  typeTemplateId,
  validateManifest,
} from './manifest.js';
export {
  type ContributionInstaller,
  type DiscoveredPlugin,
  PluginHost,
  type PluginHostOptions,
  type PluginState,
  type PluginStatus,
} from './runtime.js';
