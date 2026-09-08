/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect } from 'vitest';
import { BUILTIN_FEATURES, BUILTIN_BUNDLES, assemblyTree } from '../bundles.js';

describe('bundle 装配树（design/04 §7）', () => {
  it('全 bundle 启用：15 个内置功能全部装配', () => {
    const rows = assemblyTree(
      { name: 'full', plugins: ['com.hongyue.bundle.core', 'com.hongyue.bundle.world', 'com.hongyue.bundle.ai'] },
      BUILTIN_BUNDLES,
    );
    expect(rows).toHaveLength(BUILTIN_FEATURES.length);
    expect(rows.every((r) => r.enabled)).toBe(true);
    expect(rows.find((r) => r.feature === 'core.writing')?.source).toBe('com.hongyue.bundle.core');
    expect(rows.find((r) => r.feature === 'core.assistant')?.source).toBe('com.hongyue.bundle.ai');
  });

  it('minimal 档：ai.request deny 关闭全部 AI 触点，纯写作保留', () => {
    const rows = assemblyTree(
      { name: 'minimal', plugins: ['com.hongyue.bundle.core'], policies: { 'ai.request': 'deny' } },
      BUILTIN_BUNDLES,
    );
    const writing = rows.find((r) => r.feature === 'core.writing')!;
    const assistant = rows.find((r) => r.feature === 'core.assistant')!;
    expect(writing.enabled).toBe(true);
    expect(assistant.enabled).toBe(false);
    expect(assistant.reason).toContain('ai.request');
  });

  it('依赖传递：世界 bundle 未启用时角色功能连带禁用', () => {
    const rows = assemblyTree(
      { name: 'partial', plugins: ['com.hongyue.bundle.core', 'com.hongyue.bundle.ai'] },
      BUILTIN_BUNDLES,
    );
    const characters = rows.find((r) => r.feature === 'core.characters')!;
    expect(characters.enabled).toBe(false);
    expect(characters.reason).toContain('依赖');
  });
});
