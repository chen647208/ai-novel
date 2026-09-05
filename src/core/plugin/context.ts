/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件上下文（design/04 §2 函数契约 + §3 命名空间 + §9 生态边界）。
 *
 * 插件间交互的唯一合法通道（DSH 插件乱象的 day-1 对策）：
 *  1. 事件：只能在本插件命名空间内发布（plugin.<shortId>.*），越域即抛错；
 *  2. 数据：必须声明 permissions 并经宿主权限代理（deny-by-default）；
 *  3. 依赖：manifest.dependencies 声明 + 版本区间，激活按拓扑序；
 *  4. 禁止直连其他插件的内部模块（独立作品原则，§9）。
 *
 * 函数契约：宿主回调的函数同步、无副作用、幂等；异步只能经 tasks。
 */

import type { EventBus, SeamPolicy } from './events.js';
import { shortId, type Disposable, type PluginPermissions } from './manifest.js';

/** 插件任务句柄：宿主在停用/卸载时可等待或放弃。 */
export interface TaskHandle extends Disposable {
  readonly label: string;
  readonly done: Promise<unknown>;
}

export interface PluginContextOptions {
  events: EventBus;
  permissions?: PluginPermissions;
  /** 数据域适配器（v0 仅 'index' 只读可用；其余随 worker 沙箱接入） */
  dataAdapter?: {
    read(domain: string, query: Record<string, unknown>): Promise<unknown[]>;
  };
}

export interface PluginContext {
  readonly pluginId: string;
  /** 命名空间化事件：emit 强制本插件域前缀，on 可观察全域 */
  events: {
    on(type: string, handler: (payload: unknown) => void): Disposable;
    emit(type: string, payload: unknown): void;
  };
  /** 拦截器注册（ai.request 等；v0 面向宿主声明的接缝） */
  seams: {
    decorate(seam: 'fs' | 'ai' | 'index', policy: SeamPolicy): Disposable;
  };
  /** 异步任务登记（宿主停用时可等待/放弃） */
  tasks: {
    register(label: string, task: Promise<unknown>): TaskHandle;
  };
  /** 数据访问：按 permissions 裁剪；未声明域直接 PermissionDenied */
  store: {
    read(domain: string, query: Record<string, unknown>): Promise<unknown[]>;
  };
}

const taskRegistry = new WeakMap<object, TaskHandle[]>();

export function createPluginContext(pluginId: string, options: PluginContextOptions): PluginContext {
  const domain = `plugin.${shortId(pluginId)}.`;
  const taskList: TaskHandle[] = [];

  const context: PluginContext = {
    pluginId,

    events: {
      on: (type, handler) => options.events.on(type, handler, pluginId),
      emit: (type, payload) => {
        if (!type.startsWith(domain)) {
          throw new Error(`事件越域：${pluginId} 只能发布 ${domain}* 事件，实际 "${type}"`);
        }
        options.events.emit(type, payload);
      },
    },

    seams: {
      decorate: (seam, policy) => options.events.decorate(seam, policy, pluginId),
    },

    tasks: {
      register: (label, task) => {
        const handle: TaskHandle = {
          label,
          done: task,
          dispose: () => void 0,
        };
        void task.catch(() => undefined);
        taskList.push(handle);
        return handle;
      },
    },

    store: {
      read: async (dom, query) => {
        if (!options.permissions?.read?.includes(dom)) {
          throw new Error(`权限拒绝：${pluginId} 未声明 read:${dom}`);
        }
        if (!options.dataAdapter) {
          throw new Error(`数据域 ${dom} 的适配器随 worker 沙箱里程碑接入`);
        }
        return options.dataAdapter.read(dom, query);
      },
    },
  };

  taskRegistry.set(context, taskList);
  return context;
}

/** 测试/审计辅助：登记过的任务清单。 */
export function registeredTasks(context: PluginContext): TaskHandle[] {
  return taskRegistry.get(context) ?? [];
}

/** 供宿主驱动的任务收敛（停用插件前等待/放弃）。 */
export async function drainTasks(context: PluginContext): Promise<void> {
  for (const handle of registeredTasks(context)) {
    await handle.done.catch(() => undefined);
  }
}
