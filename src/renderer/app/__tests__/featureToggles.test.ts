// @vitest-environment jsdom
/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  getDisabledFeatures,
  isFeatureEnabled,
  setFeatureEnabled,
  subscribeFeatureToggles,
} from '../featureToggles';

describe('featureToggles', () => {
  beforeEach(() => {
    // 复位：清空全部开关
    for (const id of ['panel.assistant', 'panel.globalSearch'] as const) setFeatureEnabled(id, true);
  });

  it('默认开启，关闭后禁用并写入本地偏好', () => {
    expect(isFeatureEnabled('panel.assistant')).toBe(true);
    setFeatureEnabled('panel.assistant', false);
    expect(isFeatureEnabled('panel.assistant')).toBe(false);
    expect(getDisabledFeatures()).toContain('panel.assistant');
    expect(window.localStorage.getItem('features.disabled')).toContain('panel.assistant');

    setFeatureEnabled('panel.assistant', true);
    expect(isFeatureEnabled('panel.assistant')).toBe(true);
    expect(getDisabledFeatures()).not.toContain('panel.assistant');
  });

  it('订阅者在开关变化时被通知，退订后不再通知', () => {
    let calls = 0;
    const off = subscribeFeatureToggles(() => {
      calls += 1;
    });
    setFeatureEnabled('panel.globalSearch', false);
    expect(calls).toBe(1);
    off();
    setFeatureEnabled('panel.globalSearch', true);
    expect(calls).toBe(1);
  });
});
