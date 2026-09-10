/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件服务（渲染端）：磁盘发现 + 装配进运行时。
 *
 * 插件布局：userData/plugins/<pluginId>/plugin.json（+ 贡献点文件）。
 * v0 开放资源型贡献点：skills（SKILL.md 写法技能）→ SkillCatalog；
 * types → 内置类型注册表（强制命名空间前缀），buildProfiles → 构建档注册表，
 * hooks → 事件总线声明式策略。逻辑型 JS/WASM 不执行（无沙箱）。
 * 禁用清单持久化在设置域（配置级 disabled，不碰插件文件）。
 */
import { parseSkillMd, type SkillCatalog } from '@core/ai';
import { PluginHost, installHooks, installTypeTemplates, typeTemplateId } from '@core/plugin';
import type {
  BuildProfileRegistry,
  EventBus,
  DiscoveredPlugin,
  Disposable,
  PluginStatus,
  PluginHostOptions,
} from '@core/plugin';
import { builtinRegistry } from '@core/types-registry';

function electron(): NonNullable<Window['electronAPI']> {
  if (!window.electronAPI) {
    throw new Error('插件发现需要文件系统（预览环境不可用）');
  }
  return window.electronAPI;
}

/** 从 userData/plugins/ 发现插件并装载进宿主。读取/校验失败按 failed 登记，面板可见。 */
export async function discoverAndLoad(host: PluginHost, _installer: (plugin: DiscoveredPlugin) => Disposable[]): Promise<void> {
  const api = electron();
  const base = await api.getAppDataPath();
  const root = `${base}/plugins`;
  const entries = await api.listDirectory(root).catch(() => []);
  for (const dir of entries.filter((e) => e.type === 'directory')) {
    const pluginId = dir.name;
    try {
      const manifestJson = JSON.parse(await api.readFile(`${root}/${pluginId}/plugin.json`)) as unknown;
      const files: Record<string, string> = {};
      // 浅层收集贡献点文件（skills/types/buildProfiles 目录下的文件）
      const contributes = (manifestJson as { contributes?: Record<string, string[]> }).contributes;
      for (const dirKey of ['skills', 'types', 'buildProfiles'] as const) {
        for (const rel of contributes?.[dirKey] ?? []) {
          const cleanRel = rel.replace(/^\.\//, '').replace(/\/+$/, '');
          const fullDir = `${root}/${pluginId}/${cleanRel}`;
          for (const f of await api.listDirectory(fullDir).catch(() => [])) {
            if (f.type === 'file') {
              files[`${cleanRel}/${f.name}`] = await api.readFile(`${fullDir}/${f.name}`);
            }
          }
        }
      }
      host.loadRaw(pluginId, manifestJson, files);
    } catch (error) {
      host.markFailed(pluginId, 'discover', error);
    }
  }
}

export interface PluginDeps {
  skillCatalog: SkillCatalog;
  buildProfiles: BuildProfileRegistry;
  events: EventBus;
}

/** 贡献装配器：把资源型贡献注册进各注册表（返回 Disposable 供 unwind）。 */
export function createContributionInstaller(deps: PluginDeps) {
  return (plugin: DiscoveredPlugin): Disposable[] => {
    const disposables: Disposable[] = [];
    const manifest = plugin.manifest;

    for (const rel of manifest.contributes?.skills ?? []) {
      const prefix = `${rel.replace(/^\.\//, '').replace(/\/+$/, '')}/`;
      for (const [file, content] of Object.entries(plugin.files)) {
        if (!file.startsWith(prefix) || !file.endsWith('.md')) continue;
        const parsed = parseSkillMd(content, 'plugin', `${manifest.id}/${file}`);
        if (parsed.skill) {
          deps.skillCatalog.register(parsed.skill);
          const name = parsed.skill.name;
          disposables.push({ dispose: () => deps.skillCatalog.unregister(name) });
        }
      }
    }

    // 类型模板：强制命名空间前缀（验收 4），宿主内置注册表共享
    for (const rel of manifest.contributes?.types ?? []) {
      const prefix = `${rel.replace(/^\.\//, '').replace(/\/+$/, '')}/`;
      for (const [file, content] of Object.entries(plugin.files)) {
        if (!file.startsWith(prefix) || !file.endsWith('.json')) continue;
        try {
          const templates = JSON.parse(content) as Array<Record<string, unknown>>;
          disposables.push(...installTypeTemplates(manifest.id, templates, builtinRegistry, typeTemplateId));
        } catch {
          // 单文件损坏跳过（状态面板可经 markFailed 观测装载期错误）
        }
      }
    }

    // Build Profile（07 篇导出构建消费）
    for (const rel of manifest.contributes?.buildProfiles ?? []) {
      const prefix = `${rel.replace(/^\.\//, '').replace(/\/+$/, '')}/`;
      for (const [file, content] of Object.entries(plugin.files)) {
        if (!file.startsWith(prefix) || !file.endsWith('.json')) continue;
        try {
          const profile = JSON.parse(content) as Parameters<BuildProfileRegistry['register']>[0];
          disposables.push(deps.buildProfiles.register(profile));
        } catch {
          // 同上：损坏档案跳过
        }
      }
    }

    // hooks（能力接缝，JSON 声明式策略）
    const hooksFile = manifest.contributes?.hooks;
    if (hooksFile) {
      const key = hooksFile.replace(/^\.\//, '');
      const raw = plugin.files[key];
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { hooks?: unknown } | unknown[];
          const list = Array.isArray(parsed) ? parsed : ((parsed.hooks ?? []) as unknown[]);
          disposables.push(...installHooks(list as never[], deps.events, manifest.id));
        } catch {
          // hooks 声明损坏跳过
        }
      }
    }

    return disposables;
  };
}

/** 创建宿主并完成一次完整发现-装载-激活循环（预览环境无文件系统时跳过磁盘发现）。 */
export async function bootstrapPlugins(deps: PluginDeps, hostVersion: string, disabled: string[]): Promise<PluginHost> {
  const host = new PluginHost({ hostVersion, disabled }, createContributionInstaller(deps));
  try {
    await discoverAndLoad(host, createContributionInstaller(deps));
    // 发现后立即激活全部（含依赖拓扑）：否则插件停在 discovered，贡献点永不生效
    host.activateAll();
  } catch {
    // 无 electronAPI：运行时仍可用于内置流程
  }
  return host;
}

export type { PluginStatus, PluginHostOptions };
