/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件贡献路径门（docs/design/04 §11.2）的词法与作用域部分。
 *
 * 覆盖两道门：拒绝清单（deny-list）、作用域（只能相对且不含 `..`，落在插件目录内）。
 * 符号链接解析（realpath 包含）需要宿主文件系统，由主进程 fs 代理承担，本模块保持平台无关。
 */

import {
  hasDeniedPluginSegment,
  isUnsafePluginRel,
  PLUGIN_DENY_SEGMENTS,
} from '../../shared/constants/pluginPaths';

export { PLUGIN_DENY_SEGMENTS };

export type PluginPathCheck = { ok: true; rel: string } | { ok: false; reason: string };

/**
 * 校验插件贡献相对路径：去 `./` 前缀、去尾斜杠，拒绝空、绝对路径、`..` 越界与拒绝清单命中。
 * 通过时返回规范化后的相对路径（`/` 分隔）。
 */
export function checkPluginRelPath(rel: string): PluginPathCheck {
  if (typeof rel !== 'string') return { ok: false, reason: '路径必须是字符串' };
  const raw = rel.replace(/^\.\//, '').replace(/\/+$/, '');
  if (!raw) return { ok: false, reason: '空路径' };
  if (isUnsafePluginRel(raw)) return { ok: false, reason: `路径越界或绝对路径：${raw}` };
  if (hasDeniedPluginSegment(raw)) return { ok: false, reason: `命中拒绝清单：${raw}` };
  return { ok: true, rel: raw.split(/[\\/]+/).join('/') };
}

/** 单个目录项名（不含分隔符）校验：复用相对路径规则，额外拒绝 `.` / `..`。 */
export function checkPluginFileName(name: string): PluginPathCheck {
  if (!name || name === '.' || name === '..' || /[\\/]/.test(name)) {
    return { ok: false, reason: `非法文件名：${name}` };
  }
  return checkPluginRelPath(name);
}

/** 拼接插件根与已校验的相对路径（统一 `/`）。 */
export function joinPluginPath(root: string, rel: string): string {
  return `${root.replace(/[\\/]+$/, '')}/${rel}`;
}
