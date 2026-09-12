/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect,it } from 'vitest';

import { runWasm } from '../wasmRunner.js';

/** 示例插件的 WASM 技能产物（由 `npm run wasm:build` 从 handler.wat 编译）。 */
const WASM_PATH = join(process.cwd(), 'examples/plugins/wasm-skill/skills/sum-series/handler.wasm');

describe('WASM 示例插件 handler.wasm', () => {
  it('无导入纯计算，run 返回 1..9 之和', async () => {
    const moduleBase64 = readFileSync(WASM_PATH).toString('base64');
    const result = await runWasm({ code: '', mode: 'wasm', moduleBase64 });
    expect(result.ok).toBe(true);
    expect(result.output).toBe(45);
  });
});
