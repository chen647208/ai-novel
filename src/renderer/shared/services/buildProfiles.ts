/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 构建档注册表单源（内置 + 插件贡献同路径）。
 * 导出预设列表、插件装配（aiRuntime → bootstrapPlugins）共用此实例；
 * 类型为 core/build 单源 BuildProfile（见 design/18 §五 已统一）。
 */
import { BuildProfileRegistry, buildProfileKey } from '@core/plugin';
import { COMPENDIUM_BUILD_PROFILE, DEFAULT_BUILD_PROFILE } from '@core/build';

export const buildProfileRegistry = new BuildProfileRegistry();
buildProfileRegistry.register(DEFAULT_BUILD_PROFILE);
buildProfileRegistry.register(COMPENDIUM_BUILD_PROFILE);

export const profileKey = buildProfileKey;
