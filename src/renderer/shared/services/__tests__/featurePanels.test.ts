/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect, it, vi } from 'vitest';

import { featurePanelsVersion, getFeaturePanel, registerFeaturePanel, subscribeFeaturePanels } from '../featurePanels';

const Dummy = () => null;

describe('featurePanels（跨 feature 面板注册表）', () => {
  it('注册/获取/解绑，版本随变更递增', () => {
    const before = featurePanelsVersion();
    const dispose = registerFeaturePanel('test.panel', Dummy);
    expect(getFeaturePanel('test.panel')).toBeDefined();
    expect(featurePanelsVersion()).toBeGreaterThan(before);
    dispose();
    expect(getFeaturePanel('test.panel')).toBeUndefined();
  });

  it('订阅在注册/解绑时收到通知', () => {
    const listener = vi.fn();
    const unsub = subscribeFeaturePanels(listener);
    const dispose = registerFeaturePanel('test.panel.2', Dummy);
    expect(listener).toHaveBeenCalled();
    dispose();
    unsub();
  });
});
