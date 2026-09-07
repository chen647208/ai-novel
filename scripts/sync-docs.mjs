/*
 * 本文件属于 红月 (Hongyue) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 把 docs/{design,guides,features} 链入 docs-site/src（VitePress 内容源）。
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

for (const sub of ['design', 'guides', 'features']) {
  const src = join('docs', sub);
  const dst = join('docs-site', 'src', sub);
  if (!existsSync(src)) continue;
  if (existsSync(dst)) rmSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
}
console.log('docs content synced');
