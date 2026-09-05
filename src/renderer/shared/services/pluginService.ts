/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件服务（渲染端，M3.2）：磁盘发现 + 装配进运行时。
 *
 * 插件布局：userData/plugins/<pluginId>/plugin.json（+ 贡献点文件）。
 * v0 开放资源型贡献点：skills（SKILL.md 写法技能）→ SkillCatalog；
 * types/buildProfiles 贡献随对应里程碑接线（运行时已保留槽位）。
 * 禁用清单持久化在设置域（配置级 disabled，不碰插件文件）。
 */
import { parseSkillMd, type SkillCatalog } from '@core/ai';
import { PluginHost, type DiscoveredPlugin, type Disposable, type PluginStatus, type PluginHostOptions } from '@core/plugin';

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

/** 贡献装配器：把资源型贡献注册进各注册表（返回 Disposable 供 unwind）。 */
export function createContributionInstaller(skillCatalog: SkillCatalog) {
  return (plugin: DiscoveredPlugin): Disposable[] => {
    const disposables: Disposable[] = [];
    const manifest = plugin.manifest;

    for (const rel of manifest.contributes?.skills ?? []) {
      const prefix = `${rel.replace(/^\.\//, '').replace(/\/+$/, '')}/`;
      for (const [file, content] of Object.entries(plugin.files)) {
        if (!file.startsWith(prefix) || !file.endsWith('.md')) continue;
        const parsed = parseSkillMd(content, 'plugin', `${manifest.id}/${file}`);
        if (parsed.skill) {
          skillCatalog.register(parsed.skill);
          const name = parsed.skill.name;
          disposables.push({ dispose: () => skillCatalog.unregister(name) });
        }
      }
    }

    // types/buildProfiles 贡献随 07 篇（导出构建）里程碑接线
    return disposables;
  };
}

/** 创建宿主并完成一次完整发现-装载循环（预览环境无文件系统时跳过磁盘发现）。 */
export async function bootstrapPlugins(skillCatalog: SkillCatalog, hostVersion: string, disabled: string[]): Promise<PluginHost> {
  const host = new PluginHost({ hostVersion, disabled }, createContributionInstaller(skillCatalog));
  try {
    await discoverAndLoad(host, createContributionInstaller(skillCatalog));
  } catch {
    // 无 electronAPI：运行时仍可用于内置流程
  }
  return host;
}

export type { PluginStatus, PluginHostOptions };
