/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，
 * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。
 */

import { describe, it, expect } from 'vitest';
import { buttonClass } from '../buttonClass';

describe('buttonClass', () => {
  it('默认拼接 primary + md', () => {
    expect(buttonClass()).toBe('btn btn-primary btn-md');
  });

  it('按变体与尺寸映射语义类', () => {
    expect(buttonClass({ variant: 'danger', size: 'sm' })).toBe('btn btn-danger btn-sm');
    expect(buttonClass({ variant: 'ghost', size: 'lg' })).toBe('btn btn-ghost btn-lg');
  });

  it('block 追加占满宽度类', () => {
    expect(buttonClass({ block: true })).toBe('btn btn-primary btn-md btn-block');
  });

  it('自定义 className 置于末尾以便覆盖', () => {
    expect(buttonClass({ variant: 'secondary', className: 'mt-4' })).toBe('btn btn-secondary btn-md mt-4');
  });
});
