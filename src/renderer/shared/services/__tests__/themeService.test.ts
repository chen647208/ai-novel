/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveTheme, applyTheme, systemPrefersDark, watchSystemTheme } from '../themeService';

/** 安装最小 window.matchMedia 桩；返回当前是否“偏好深色”。 */
function stubMatchMedia(matches: boolean) {
  const mq = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('window', { matchMedia: vi.fn(() => mq) });
  return mq;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('systemPrefersDark / resolveTheme', () => {
  it('无 window 时按浅色处理', () => {
    expect(systemPrefersDark()).toBe(false);
    expect(resolveTheme('system')).toBe('light');
  });

  it('固定主题不受系统影响', () => {
    stubMatchMedia(true);
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme(undefined)).toBe('light');
  });

  it('system 偏好跟随 matchMedia', () => {
    stubMatchMedia(true);
    expect(resolveTheme('system')).toBe('dark');
    stubMatchMedia(false);
    expect(resolveTheme('system')).toBe('light');
  });
});

describe('applyTheme', () => {
  it('切换 .dark 类并设置内联 color-scheme 驱动 light-dark()', () => {
    const classes = new Set<string>();
    const style: { colorScheme?: string } = {};
    vi.stubGlobal('document', {
      documentElement: {
        classList: { toggle: (name: string, on: boolean) => { if (on) classes.add(name); else classes.delete(name); } },
        style,
      },
    });
    stubMatchMedia(false);

    expect(applyTheme('dark')).toBe('dark');
    expect(classes.has('dark')).toBe(true);
    expect(style.colorScheme).toBe('dark');

    expect(applyTheme('light')).toBe('light');
    expect(classes.has('dark')).toBe(false);
    expect(style.colorScheme).toBe('light');

    expect(applyTheme('system')).toBe('light');
    expect(style.colorScheme).toBe('light');
  });
});

describe('watchSystemTheme', () => {
  it('注册 change 监听并在清理时移除', () => {
    const mq = stubMatchMedia(true);
    const onChange = vi.fn();
    const dispose = watchSystemTheme(onChange);

    expect(mq.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    const handler = mq.addEventListener.mock.calls[0]![1] as () => void;
    handler();
    expect(onChange).toHaveBeenCalledWith('dark');

    dispose();
    expect(mq.removeEventListener).toHaveBeenCalledWith('change', handler);
  });

  it('无 matchMedia 时返回空清理函数不抛错', () => {
    const dispose = watchSystemTheme(() => {});
    expect(() => dispose()).not.toThrow();
  });
});
