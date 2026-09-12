/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 生成 CycloneDX SBOM（软件物料清单）：只读 package-lock 运行期依赖。
 * 产物写到 build/sbom.cdx.json（构建产物，不入库）；供 CI 归档/供应链审计。
 * 用法：npm run sbom
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const rootPkg = JSON.parse(readFileSync('package.json', 'utf8'));

/** 从 lock 的 key 取包名（取最后一段 node_modules/ 之后）。 */
function nameOf(key) {
  const marker = 'node_modules/';
  return key.slice(key.lastIndexOf(marker) + marker.length);
}

const components = [];
for (const [key, meta] of Object.entries(lock.packages ?? {})) {
  if (!key.includes('node_modules/') || meta.dev || meta.link) continue;
  const name = meta.name ?? nameOf(key);
  const version = meta.version ?? '';
  const license = typeof meta.license === 'string' ? meta.license : undefined;
  components.push({
    type: 'library',
    name,
    version,
    ...(license ? { licenses: [{ license: { id: license } }] } : {}),
  });
}
components.sort((a, b) => (a.name === b.name ? a.version.localeCompare(b.version) : a.name.localeCompare(b.name)));

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  version: 1,
  metadata: {
    component: { type: 'application', name: rootPkg.name, version: rootPkg.version, licenses: [{ license: { id: 'AGPL-3.0-only' } }] },
  },
  components,
};

mkdirSync('build', { recursive: true });
writeFileSync('build/sbom.cdx.json', `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');
console.log(`SBOM 已写入 build/sbom.cdx.json（${components.length} 个运行期依赖）。`);
