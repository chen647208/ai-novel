#!/usr/bin/env node
/**
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 为 src/ 下所有 .ts/.tsx 源码文件批量插入 AGPL-3.0 / SPDX 许可证声明头。
 * 幂等：已包含 SPDX-License-Identifier 的文件会被跳过。
 * 保留每个文件原有的 BOM 与换行风格（CRLF/LF）。
 *
 * 用法：
 *   node scripts/add-license-headers.mjs           # 插入缺失的声明头
 *   node scripts/add-license-headers.mjs --check   # 仅检查，发现缺失则退出码 1（供 CI 使用）
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['src'];
const EXTENSIONS = new Set(['.ts', '.tsx']);
const MARKER = 'SPDX-License-Identifier';

const HEADER_LINES = [
  '/*',
  ' * 本文件属于 红月创作 (Hongyue Creation) 项目。',
  ' * Copyright (C) 2026 chen647208',
  ' * SPDX-License-Identifier: AGPL-3.0-only',
  ' *',
  ' * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；',
  ' * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。',
  ' */',
];

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (EXTENSIONS.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

/** 头部是否已在文件最前（允许 BOM 之后紧接）。 */
function isHeaderAtTop(body, eol) {
  return body.startsWith(HEADER_LINES.join(eol));
}

/** 去掉文件任意位置的既有许可证头（块注释），返回剩余正文。 */
function stripExistingHeader(body) {
  const markerIdx = body.indexOf(MARKER);
  if (markerIdx < 0) return body;
  const start = body.lastIndexOf('/*', markerIdx);
  const end = body.indexOf('*/', markerIdx);
  if (start < 0 || end < 0) return body;
  return body.slice(0, start) + body.slice(end + 2);
}

const checkOnly = process.argv.includes('--check');
const files = [];
for (const dir of SCAN_DIRS) {
  walk(join(ROOT, dir), files);
}

const missing = [];
let modified = 0;

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const bom = raw.startsWith('\uFEFF') ? '\uFEFF' : '';
  const body = bom ? raw.slice(1) : raw;
  const eol = body.includes('\r\n') ? '\r\n' : '\n';
  const atTop = isHeaderAtTop(body, eol);
  if (atTop) continue; // 已就位
  missing.push(file);
  if (checkOnly) continue;
  const header = HEADER_LINES.join(eol) + eol + eol;
  const stripped = stripExistingHeader(body).replace(/^\s+/, '');
  writeFileSync(file, bom + header + stripped, 'utf8');
  modified += 1;
}

const rel = (f) => f.slice(ROOT.length + 1).replace(/\\/g, '/');

if (checkOnly) {
  if (missing.length > 0) {
    console.error(`许可证声明头缺失或不在文件首位（${missing.length} 个），请运行 npm run headers：`);
    for (const f of missing) console.error(`  ${rel(f)}`);
    process.exit(1);
  }
  console.log(`许可证声明头检查通过（${files.length} 个文件）。`);
} else {
  console.log(`共扫描 ${files.length} 个文件，插入声明头 ${modified} 个，跳过已有 ${files.length - modified} 个。`);
}
