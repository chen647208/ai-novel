/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 编译示例插件的 WAT 源码为 WASM：扫描 examples/plugins 下所有 `.wat`，
 * 用 wabt 编译为同名 `.wasm`（产物随包提交，供示例与回归测试直接加载）。
 * 用法：npm run wasm:build
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const wabtFactory = require('wabt');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseDir = join(root, 'examples/plugins');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.wat')) out.push(full);
  }
  return out;
}

const wabt = await wabtFactory();
let built = 0;
for (const watFile of walk(baseDir)) {
  const module = wabt.parseWat(watFile, readFileSync(watFile, 'utf-8'));
  module.resolveNames();
  module.validate();
  const { buffer } = module.toBinary({ log: false, write_debug_names: false });
  const outFile = watFile.replace(/\.wat$/, '.wasm');
  writeFileSync(outFile, Buffer.from(buffer));
  module.destroy();
  built += 1;
  console.log(`built ${outFile.replace(root, '').replace(/\\/g, '/')}`);
}
console.log(`完成：编译 ${built} 个 WAT → WASM。`);
