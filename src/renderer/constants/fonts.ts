/*
 * 本文件属于 AI小说家 (ai-novel) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import type { CustomFontMeta } from '../../shared/types';

/**
 * 字体预设注册表（对标 modelProviders/embeddingProviders：数据与展示分离）。
 * 只收「免费、可商用」的中西文字体；不随包发二进制（CJK 动辄几十 MB），
 * 以系统回退栈 + 官方下载链接 + 自定义导入三种方式落地。
 */
export interface FontPreset {
  id: string;
  /** 展示名（中英直写，随界面语言切换由调用方映射） */
  name: Record<'zh' | 'en', string>;
  /** font-family 栈（逗号分隔已拼好） */
  stack: string;
  /** 授权说明 */
  license: Record<'zh' | 'en', string>;
  /** 官方下载页（无则为空，系统自带） */
  downloadUrl: string;
  category: 'serif' | 'sans';
}

export const DEFAULT_UI_FONT = 'system';
export const DEFAULT_EDITOR_FONT = 'noto-serif';

export const fontPresets: FontPreset[] = [
  {
    id: 'system',
    name: { zh: '系统默认', en: 'System Default' },
    stack: `system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif`,
    license: { zh: '随系统', en: 'System' },
    downloadUrl: '',
    category: 'sans',
  },
  {
    id: 'noto-serif',
    name: { zh: 'Noto 宋体', en: 'Noto Serif SC' },
    stack: `"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif`,
    license: { zh: 'OFL 免费商用', en: 'OFL, free for commercial use' },
    downloadUrl: 'https://fonts.google.com/noto/specimen/Noto+Serif+SC',
    category: 'serif',
  },
  {
    id: 'noto-sans',
    name: { zh: 'Noto 黑体', en: 'Noto Sans SC' },
    stack: `"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`,
    license: { zh: 'OFL 免费商用', en: 'OFL, free for commercial use' },
    downloadUrl: 'https://fonts.google.com/noto/specimen/Noto+Sans+SC',
    category: 'sans',
  },
  {
    id: 'wenkai',
    name: { zh: '霞鹜文楷', en: 'LXGW WenKai' },
    stack: `"LXGW WenKai", "LXGW WenKai Screen", "Noto Serif SC", serif`,
    license: { zh: 'OFL 免费商用', en: 'OFL, free for commercial use' },
    downloadUrl: 'https://github.com/lxgw/LxgwWenKai',
    category: 'serif',
  },
  {
    id: 'source-han-serif',
    name: { zh: '思源宋体', en: 'Source Han Serif SC' },
    stack: `"Source Han Serif SC", "Noto Serif SC", "Songti SC", "SimSun", serif`,
    license: { zh: 'OFL 免费商用', en: 'OFL, free for commercial use' },
    downloadUrl: 'https://github.com/adobe-fonts/source-han-serif',
    category: 'serif',
  },
  {
    id: 'puhuiti',
    name: { zh: '阿里普惠体', en: 'Alibaba PuHuiTi' },
    stack: `"Alibaba PuHuiTi 3.0", "Alibaba PuHuiTi", "Noto Sans SC", "Microsoft YaHei", sans-serif`,
    license: { zh: '阿里免费商用', en: 'Free for commercial use (Alibaba)' },
    downloadUrl: 'https://www.alibabafonts.com/',
    category: 'sans',
  },
  {
    id: 'harmony',
    name: { zh: '鸿蒙字体', en: 'HarmonyOS Sans SC' },
    stack: `"HarmonyOS Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`,
    license: { zh: '华为免费商用', en: 'Free for commercial use (Huawei)' },
    downloadUrl: 'https://developer.huawei.com/consumer/cn/design/harmonyos-sans/',
    category: 'sans',
  },
];

export function findFontPreset(id: string | undefined): FontPreset | undefined {
  if (!id) return undefined;
  return fontPresets.find((p) => p.id === id);
}

/** 解析字体选择为 CSS font-family：预设取栈，custom:<id> 取自定义家族名。 */
export function resolveFontStack(
  selection: string | undefined,
  fallbackPresetId: string,
  customFonts: CustomFontMeta[] = []
): string {
  if (selection?.startsWith('custom:')) {
    const meta = customFonts.find((c) => c.id === selection.slice('custom:'.length));
    if (meta) return `"${meta.name}", serif`;
  }
  return findFontPreset(selection)?.stack ?? findFontPreset(fallbackPresetId)?.stack ?? 'serif';
}
