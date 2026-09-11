/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { buttonVariants } from '../Button';

describe('buttonVariants', () => {
  it('默认变体与尺寸', () => {
    const cls = buttonVariants();
    expect(cls).toContain('bg-primary');
    expect(cls).toContain('h-9');
  });

  it('各变体映射到对应令牌类', () => {
    expect(buttonVariants({ variant: 'secondary' })).toContain('bg-secondary');
    expect(buttonVariants({ variant: 'outline' })).toContain('border-input');
    expect(buttonVariants({ variant: 'ghost' })).toContain('hover:bg-accent');
    expect(buttonVariants({ variant: 'destructive' })).toContain('bg-destructive');
    expect(buttonVariants({ variant: 'link' })).toContain('text-link');
  });

  it('各尺寸映射高度类', () => {
    expect(buttonVariants({ size: 'sm' })).toContain('h-8');
    expect(buttonVariants({ size: 'lg' })).toContain('h-10');
    expect(buttonVariants({ size: 'icon' })).toContain('w-9');
  });

  it('基础类始终存在（焦点环/禁用态/图标收缩）', () => {
    const cls = buttonVariants({ variant: 'ghost', size: 'sm' });
    expect(cls).toContain('focus-visible:ring-2');
    expect(cls).toContain('disabled:opacity-50');
    expect(cls).toContain('[&_svg]:shrink-0');
  });
});
