/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 类型逃逸棘轮：统计 `as unknown as`（非测试代码），超过上限即失败。
 * 上限只许随清理下降；新增逃逸要么用真实类型收窄，要么把双断言收成单次合理断言。
 */
import fs from 'node:fs';
import path from 'node:path';

/** 当前上限（2026-09 基线）。清理后同步下调。 */
const CEILING = 37;
const ROOT = path.resolve(process.cwd(), 'src');
const EXCLUDE = [/__tests__/, /\.test\.ts$/, /\.spec\.ts$/];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT).filter((f) => !EXCLUDE.some((re) => re.test(f)));
let count = 0;
const perFile = [];
for (const f of files) {
  const hits = (fs.readFileSync(f, 'utf8').match(/\bas unknown as\b/g) ?? []).length;
  if (hits > 0) {
    count += hits;
    perFile.push([path.relative(process.cwd(), f), hits]);
  }
}

if (count > CEILING) {
  console.error(`类型逃逸超限：as unknown as 共 ${count} 处，上限 ${CEILING}。`);
  perFile.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([f, n]) => console.error(`  ${n}  ${f}`));
  process.exit(1);
}
console.log(`类型逃逸检查通过：as unknown as ${count} 处（上限 ${CEILING}）。`);
