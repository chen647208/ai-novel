/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 跨 feature 面板注册表（design/02 特性契约）：拥有者注册面板组件，消费方经 `FeaturePanel` 渲染，
 * 避免 feature→feature 直接 import 组件。组件以 `unknown` 登记、按 ElementType 渲染，免类型耦合。
 */
import * as React from 'react';

export type FeaturePanelRender = (props: Record<string, unknown>) => React.ReactNode;

const panels = new Map<string, FeaturePanelRender>();
const listeners = new Set<() => void>();
let version = 0;

/** 注册面板组件；返回解绑函数。组件以 unknown 接收，调用侧用 FeaturePanel 透传 props。 */
export function registerFeaturePanel(id: string, component: unknown): () => void {
  panels.set(id, (props) => React.createElement(component as React.ElementType, props));
  bump();
  return () => {
    panels.delete(id);
    bump();
  };
}

export function getFeaturePanel(id: string): FeaturePanelRender | undefined {
  return panels.get(id);
}

export function subscribeFeaturePanels(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function featurePanelsVersion(): number {
  return version;
}

function bump(): void {
  version += 1;
  for (const listener of listeners) listener();
}
