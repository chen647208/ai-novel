/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 生成 / 校验第三方依赖许可证清单（THIRD-PARTY-LICENSES.md）。
 * 只读 package-lock.json 的运行期依赖（排除 dev/link），不引入额外依赖。
 *
 * 用法：
 *   node scripts/third-party-licenses.mjs            # 生成并写入文件
 *   node scripts/third-party-licenses.mjs --check    # 校验文件是否最新；缺许可证也失败
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(root, 'package-lock.json');
const outPath = join(root, 'THIRD-PARTY-LICENSES.md');
const check = process.argv.includes('--check');

const lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
const packages = lock.packages ?? {};

/** 从 lock 的 key 取包名（取最后一段 node_modules/ 之后）。 */
function nameOf(key) {
  const marker = 'node_modules/';
  const idx = key.lastIndexOf(marker);
  return key.slice(idx + marker.length);
}

function licenseOf(meta) {
  if (typeof meta.license === 'string') return meta.license;
  if (meta.license && typeof meta.license === 'object' && meta.license.type) return meta.license.type;
  if (Array.isArray(meta.licenses) && meta.licenses.length > 0) {
    return meta.licenses.map((l) => (typeof l === 'string' ? l : l.type)).filter(Boolean).join(' OR ');
  }
  return '';
}

const rows = [];
const unknown = [];
for (const [key, meta] of Object.entries(packages)) {
  if (!key.includes('node_modules/')) continue;
  if (meta.dev || meta.link) continue;
  const name = meta.name ?? nameOf(key);
  const version = meta.version ?? '';
  const license = licenseOf(meta);
  rows.push({ name, version, license });
  if (!license) unknown.push(`${name}@${version}`);
}
rows.sort((a, b) => (a.name === b.name ? a.version.localeCompare(b.version) : a.name.localeCompare(b.name)));

const lines = [
  '# 第三方许可证清单',
  '',
  '本文件由 `npm run licenses:generate` 生成，请勿手改。',
  '收录运行期依赖（package-lock.json 中排除 dev/link）的许可证声明；',
  '各依赖的完整许可证文本随发行包内 `node_modules` 一并分发。',
  '',
  `共 ${rows.length} 个运行期依赖。`,
  '',
  '| 依赖 | 版本 | 许可证 |',
  '| --- | --- | --- |',
  ...rows.map((r) => `| ${r.name} | ${r.version} | ${r.license || 'UNKNOWN'} |`),
  '',
];
const content = lines.join('\n');

if (unknown.length > 0) {
  console.error(`以下依赖缺少许可证字段，请人工确认：\n  ${unknown.join('\n  ')}`);
}

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf-8') : '';
  if (current.replace(/\r\n/g, '\n') !== content) {
    console.error('THIRD-PARTY-LICENSES.md 与依赖现状不一致，请运行 `npm run licenses:generate`。');
    process.exit(1);
  }
  if (unknown.length > 0) process.exit(1);
  console.log(`许可证清单校验通过（${rows.length} 项）。`);
} else {
  writeFileSync(outPath, content, 'utf-8');
  console.log(`已写入 THIRD-PARTY-LICENSES.md（${rows.length} 项，${unknown.length} 项缺失许可证）。`);
}
