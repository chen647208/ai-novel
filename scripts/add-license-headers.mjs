#!/usr/bin/env node
/**
 * 本文件属于 AI小说家 (ai-novel) 项目。
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
  ' * 本文件属于 AI小说家 (ai-novel) 项目。',
  ' * Copyright (C) 2026 chen647208',
  ' * SPDX-License-Identifier: AGPL-3.0-only',
  ' *',
  ' * 本程序为自由软件：您可依据自由软件基金会发布的 GNU Affero 通用公共许可证（AGPL-3.0，',
  ' * 或您选择的后续版本）对其进行修改与分发；商业闭源使用需另行获取授权，详见 LICENSE。',
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

function hasHeader(content) {
  // 只看文件前 400 个字符，避免误匹配正文中的字符串
  return content.slice(0, 400).includes(MARKER);
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
  if (hasHeader(body)) continue;
  missing.push(file);
  if (checkOnly) continue;
  const eol = body.includes('\r\n') ? '\r\n' : '\n';
  const header = HEADER_LINES.join(eol) + eol + eol;
  writeFileSync(file, bom + header + body, 'utf8');
  modified += 1;
}

const rel = (f) => f.slice(ROOT.length + 1).replace(/\\/g, '/');

if (checkOnly) {
  if (missing.length > 0) {
    console.error(`缺少许可证声明头的文件（${missing.length} 个），请运行 npm run headers：`);
    for (const f of missing) console.error(`  ${rel(f)}`);
    process.exit(1);
  }
  console.log(`许可证声明头检查通过（${files.length} 个文件）。`);
} else {
  console.log(`共扫描 ${files.length} 个文件，插入声明头 ${modified} 个，跳过已有 ${files.length - modified} 个。`);
}
