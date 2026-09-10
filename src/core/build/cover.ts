/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 封面生成（docs/design/16）：纯函数产出 SVG 字符串，无 DOM 依赖、可单测。
 * 渲染端把 SVG 光栅化为 PNG（canvas）；也可直接另存 SVG。
 */

export interface CoverOptions {
  title: string;
  subtitle?: string;
  imprint?: string;
  /** 画布尺寸（默认 3:4）。 */
  width?: number;
  height?: number;
  /** 主色（标题下划线/点缀）。 */
  accent?: string;
  /** 背景渐变起止色。 */
  bgFrom?: string;
  bgTo?: string;
}

const DEFAULTS = {
  width: 1200,
  height: 1600,
  accent: '#c8a15a',
  bgFrom: '#141a2e',
  bgTo: '#2a1f3d',
  imprint: '红月创作',
};

/** XML 文本转义（标题可能含 & < > 等）。 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 标题按每行最大字数折行：以空白为界优先（西文），无空白则按字符断（中文）。
 */
export function wrapTitle(title: string, maxPerLine = 9): string[] {
  const trimmed = title.trim();
  if (!trimmed) return [''];
  // 已含显式换行：按行保留
  if (trimmed.includes('\n')) return trimmed.split('\n').flatMap((line) => wrapTitle(line, maxPerLine));
  const isLatin = [...trimmed].every((ch) => ch.charCodeAt(0) < 128);
  if (isLatin) {
    const words = trimmed.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if (current && `${current} ${word}`.length > maxPerLine) {
        lines.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
  const lines: string[] = [];
  for (let i = 0; i < trimmed.length; i += maxPerLine) {
    lines.push(trimmed.slice(i, i + maxPerLine));
  }
  return lines;
}

/** 生成竖版封面 SVG。 */
export function buildCoverSvg(options: CoverOptions): string {
  const width = options.width ?? DEFAULTS.width;
  const height = options.height ?? DEFAULTS.height;
  const accent = options.accent ?? DEFAULTS.accent;
  const bgFrom = options.bgFrom ?? DEFAULTS.bgFrom;
  const bgTo = options.bgTo ?? DEFAULTS.bgTo;
  const imprint = options.imprint ?? DEFAULTS.imprint;

  const titleSize = Math.round(width * 0.085);
  const lineHeight = Math.round(titleSize * 1.35);
  const lines = wrapTitle(options.title, Math.max(4, Math.floor((width * 0.8) / titleSize)));
  const blockHeight = lines.length * lineHeight;
  const startY = Math.round(height * 0.42 - blockHeight / 2 + lineHeight * 0.7);

  const titleTspans = lines
    .map((line, i) => `<tspan x="${width / 2}" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');

  const subtitle = options.subtitle?.trim()
    ? `<text x="${width / 2}" y="${startY + blockHeight + titleSize * 0.6}" text-anchor="middle" font-size="${Math.round(width * 0.028)}" fill="#c9c9d4" font-family="serif">${escapeXml(options.subtitle.trim().slice(0, 40))}</text>`
    : '';

  const ruleY = Math.round(startY - lineHeight * 0.75);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="${escapeXml(bgFrom)}"/>`,
    `<stop offset="100%" stop-color="${escapeXml(bgTo)}"/>`,
    '</linearGradient>',
    '</defs>',
    `<rect width="${width}" height="${height}" fill="url(#bg)"/>`,
    `<rect x="${width * 0.08}" y="${height * 0.08}" width="${width * 0.84}" height="${height * 0.84}" fill="none" stroke="${escapeXml(accent)}" stroke-width="2" opacity="0.35"/>`,
    `<line x1="${width * 0.2}" y1="${ruleY}" x2="${width * 0.8}" y2="${ruleY}" stroke="${escapeXml(accent)}" stroke-width="3"/>`,
    `<text text-anchor="middle" font-size="${titleSize}" font-weight="bold" fill="#f4f1ea" font-family="serif" letter-spacing="2">${titleTspans}</text>`,
    subtitle,
    `<text x="${width / 2}" y="${height * 0.9}" text-anchor="middle" font-size="${Math.round(width * 0.024)}" fill="${escapeXml(accent)}" font-family="serif" letter-spacing="4">${escapeXml(imprint)}</text>`,
    '</svg>',
  ].join('');
}
