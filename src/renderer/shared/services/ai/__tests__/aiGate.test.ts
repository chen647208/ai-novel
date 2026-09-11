/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { afterEach,describe, expect, it } from 'vitest';

import { assertAiAllowed, setAiGate } from '../aiGate';

describe('aiGate', () => {
  afterEach(() => setAiGate(null));

  it('未注册门时放行', () => {
    expect(() => assertAiAllowed()).not.toThrow();
  });

  it('注册门后由其决定放行或拒绝', () => {
    setAiGate(() => {});
    expect(() => assertAiAllowed()).not.toThrow();
    setAiGate(() => {
      throw new Error('minimal 发行档已禁用全部 AI 请求');
    });
    expect(() => assertAiAllowed()).toThrow('禁用');
  });
});
