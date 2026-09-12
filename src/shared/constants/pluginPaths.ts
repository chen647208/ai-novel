/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 插件贡献路径的共享常量与词法校验（core 与 main 共用一份，值与判定不分叉）。
 * 语义见 docs/design/04 §11.2 的拒绝清单与作用域两道门。
 */

/** 插件贡献路径中永久拒绝的目录/文件名（小写比较）。 */
export const PLUGIN_DENY_SEGMENTS: readonly string[] = ['.git', 'node_modules', '.ssh', '.env', '.npmrc'];

/** 路径是否含 `..` 段或为绝对路径（含 Windows 盘符）。 */
export function isUnsafePluginRel(rel: string): boolean {
  if (typeof rel !== 'string' || !rel) return true;
  if (/^(?:[A-Za-z]:)?[\\/]/.test(rel)) return true;
  return rel.split(/[\\/]+/).some((s) => s === '..');
}

/** 路径是否命中拒绝清单。 */
export function hasDeniedPluginSegment(rel: string): boolean {
  return rel
    .split(/[\\/]+/)
    .some((s) => PLUGIN_DENY_SEGMENTS.includes(s.toLowerCase()));
}
