/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/** 跨 feature 面板渲染点：按 id 取注册的组件并透传 props，未注册时渲染 fallback。 */
import React, { useSyncExternalStore } from 'react';

import { featurePanelsVersion, getFeaturePanel, subscribeFeaturePanels } from '../services/featurePanels';

export interface FeaturePanelProps {
  id: string;
  fallback?: React.ReactNode;
  [key: string]: unknown;
}

export const FeaturePanel: React.FC<FeaturePanelProps> = ({ id, fallback = null, ...props }) => {
  useSyncExternalStore(subscribeFeaturePanels, featurePanelsVersion);
  const render = getFeaturePanel(id);
  if (!render) return <>{fallback}</>;
  return <>{render(props)}</>;
};
