/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 贡献注册表（docs/design/04 §4 v0 资源型贡献点）。
 * - 类型模板：插件 JSON 声明 → TypeRegistry（id 强制命名空间前缀）。
 * - Build Profile：导出构建档（07 篇消费），v0 先登记清单。
 * 注册一律返回 Disposable（unwind 不变量）。
 */
import type { BuildProfile } from '../build/profile.js';
import type { TypeRegistry,TypeTemplate } from '../types-registry';
import type { SeamPolicy } from './events.js';
import type { Disposable } from './manifest.js';

/** 构建档注册表 key：id 优先，缺省回落 name（与 core/build 单源类型）。 */
export function buildProfileKey(profile: BuildProfile): string {
  return profile.id ?? profile.name;
}

export class BuildProfileRegistry {
  private readonly profiles = new Map<string, BuildProfile>();

  register(profile: BuildProfile): Disposable {
    const key = buildProfileKey(profile);
    this.profiles.set(key, profile);
    return { dispose: () => this.profiles.delete(key) };
  }

  get(id: string): BuildProfile | undefined {
    return this.profiles.get(id);
  }

  list(): BuildProfile[] {
    return [...this.profiles.values()];
  }
}

/** hooks 声明（JSON）：一条策略 = 接缝 + 动作。 */
export interface HookDeclaration {
  on: string;
  seam?: 'fs' | 'ai' | 'index';
  do: 'inject' | 'filter' | 'observe';
  where?: 'system' | 'user';
  text?: string;
  pattern?: string;
  replacement?: string;
}

/** 解析 hooks 声明为总线操作（v0：inject/filter 落 ai 接缝，observe 落事件观察）。 */
export function installHooks(hooks: HookDeclaration[], bus: { decorate(seam: 'fs' | 'ai' | 'index', policy: SeamPolicy, pluginId?: string): Disposable }, pluginId?: string): Disposable[] {
  const disposables: Disposable[] = [];
  for (const hook of hooks) {
    if (hook.do === 'inject' || hook.do === 'filter') {
      const policy: SeamPolicy =
        hook.do === 'inject'
          ? { do: 'inject', where: hook.where ?? 'system', text: hook.text ?? '' }
          : { do: 'filter', pattern: hook.pattern ?? '', replacement: hook.replacement };
      disposables.push(bus.decorate(hook.seam ?? 'ai', policy, pluginId));
    }
  }
  return disposables;
}

/** 校验并安装插件类型模板（强制命名空间前缀，防止裸 id 抢占内置类型）。 */
export function installTypeTemplates(
  pluginId: string,
  templates: Array<Record<string, unknown>>,
  registry: TypeRegistry,
  namespaced: (pluginId: string, type: string) => string,
): Disposable[] {
  const disposables: Disposable[] = [];
  for (const raw of templates) {
    const declaredId = String(raw.id ?? '');
    if (!declaredId) continue;
    const id = namespaced(pluginId, declaredId);
    const template = { ...raw, id } as unknown as TypeTemplate;
    registry.register(template);
    disposables.push({ dispose: () => registry.unregister(id) });
  }
  return disposables;
}
