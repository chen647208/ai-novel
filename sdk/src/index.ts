/*
 * 本文件属于 @hongyue/plugin-sdk，以 MIT 许可证单独发布（见 ../README.md）。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: MIT
 */

/**
 * 插件面向的宿主契约类型（与宿主 src/core/plugin 的实现保持同步；
 * SDK 只含类型与运行时垫片，不含宿主实现——插件是独立作品）。
 */

// ── manifest v0 ──────────────────────────────────────────────────────

export interface PluginPermissions {
  read?: string[];
  write?: string[];
  network?: boolean;
  ai?: { quotaPerHour?: number };
}

export interface PluginContribution {
  /** SKILL.md 写法技能目录（资源型，零代码） */
  skills?: string[];
  /** 类型模板目录（资源型） */
  types?: string[];
  /** Build Profile（资源型） */
  buildProfiles?: string[];
  commands?: string[];
  ui?: string[];
  mcpServers?: Record<string, { command: string; args?: string[] }>;
  hooks?: string;
  editor?: string;
  renderers?: string[];
}

export interface PluginManifest {
  /** 反向域名，全局唯一，命名空间根 */
  id: string;
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  /** 宿主版本区间（如 ^2.0.0）；不匹配则贡献整体失效并上报 */
  host: string;
  /** 依赖的其他插件 id → 版本区间；激活按拓扑序，缺失/不满足/循环 = failed */
  dependencies?: Record<string, string>;
  license: string;
  engine?: string;
  contributes?: PluginContribution;
  permissions?: PluginPermissions;
  activation?: 'onDemand' | 'onStartup';
  interface?: {
    displayName?: string;
    category?: string;
    capabilities?: string[];
    defaultPrompt?: string[];
    logo?: string;
    screenshots?: string[];
  };
}

// ── 可逆注册 ─────────────────────────────────────────────────────────

/** 宿主注册 API 一律返回 Disposable；插件卸载/禁用时逆序释放。 */
export interface Disposable {
  dispose(): void;
}

// ── 错误契约 ─────────────────────────────────────────────────────────

export type PluginPhase = 'discover' | 'validate' | 'load' | 'activate' | 'deactivate' | 'runtime';

export interface PluginError {
  pluginId: string;
  phase: PluginPhase;
  message: string;
  cause: unknown[];
}

// ── 权限（deny-by-default）──────────────────────────────────────────

/** 未声明的读写域在宿主边界直接拒绝。数据域枚举：manuscript/cards/index/… */
export type DataDomain = 'manuscript' | 'cards' | 'index' | 'knowledge' | 'timeline';

// ── 运行时垫片（逻辑型贡献点在 worker/iframe 中拿到）────────────────

export interface PluginContext {
  /** 插件 id（宿主注入，插件不得伪造命名空间） */
  pluginId: string;
  /** 订阅宿主事件（域：plugin.<shortId>.<event>） */
  events: { on(type: string, handler: (payload: unknown) => void): Disposable };
  /** 异步任务登记（宿主可在退出时等待/取消） */
  tasks: { register(label: string, task: Promise<unknown>): Disposable };
  /** 数据访问代理：按 manifest.permissions 裁剪后的读写面 */
  store: {
    read<T>(domain: DataDomain, query: Record<string, unknown>): Promise<T[]>;
    write(domain: DataDomain, change: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
  };
}
