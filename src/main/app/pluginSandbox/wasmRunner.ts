/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * WASM 沙箱运行时（docs/design/21 §6 S2）。
 *
 * 实例化纯计算 WASM 模块：默认拒绝任何导入（能力白名单为空），无导入即无宿主能力。
 * 内存由 WebAssembly 线性内存保证；死循环由外层进程超时兜底（utilityProcess 被 kill）。
 */

import { Buffer } from 'node:buffer';

import type { SandboxRunRequest, SandboxRunResult } from '../../../shared/sandbox.js';

function isTypedResult(value: unknown): value is number | string | bigint | boolean | null {
  return (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  );
}

interface WasmImport {
  module: string;
  name: string;
}

interface WasmModuleHandle {
  readonly __wasmModule?: never;
}

interface WasmInstanceHandle {
  readonly exports: Record<string, unknown>;
}

interface WebAssemblyApi {
  compile(bytes: Uint8Array): Promise<WasmModuleHandle>;
  instantiate(
    module: WasmModuleHandle,
    importObject: Record<string, Record<string, unknown>>,
  ): Promise<WasmInstanceHandle>;
  Module: { imports(module: WasmModuleHandle): WasmImport[] };
}

function webAssembly(): WebAssemblyApi | undefined {
  return (globalThis as Record<string, unknown>).WebAssembly as WebAssemblyApi | undefined;
}

export async function runWasm(request: SandboxRunRequest): Promise<SandboxRunResult> {
  const base64 = request.moduleBase64;
  if (!base64) return { ok: false, error: { kind: 'runtime', message: '缺少 WASM 模块' } };

  let bytes: Buffer;
  try {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error('非法 base64');
    bytes = Buffer.from(base64, 'base64');
  } catch {
    return { ok: false, error: { kind: 'runtime', message: 'WASM 模块不是合法 base64' } };
  }

  const wa = webAssembly();
  if (!wa) return { ok: false, error: { kind: 'runtime', message: '当前环境不支持 WebAssembly' } };

  let module: WasmModuleHandle;
  try {
    module = await wa.compile(bytes);
  } catch (error) {
    return { ok: false, error: { kind: 'runtime', message: `WASM 编译失败：${String(error)}` } };
  }

  // 能力默认拒绝：任何未授权导入即拒绝实例化
  const allowed = new Set(request.allowedImports ?? []);
  const denied: string[] = [];
  for (const imp of wa.Module.imports(module)) {
    const key = `${imp.module}.${imp.name}`;
    if (!allowed.has(key)) denied.push(key);
  }
  if (denied.length) {
    return { ok: false, error: { kind: 'capability', message: `未授权 WASM 导入：${denied.join(', ')}` } };
  }

  let instance: WasmInstanceHandle;
  try {
    instance = await wa.instantiate(module, {});
  } catch (error) {
    return { ok: false, error: { kind: 'runtime', message: `WASM 实例化失败：${String(error)}` } };
  }

  const run = instance.exports.run;
  if (typeof run !== 'function') {
    return { ok: false, error: { kind: 'runtime', message: 'WASM 模块未导出 run 函数' } };
  }

  try {
    const output = (run as () => unknown)();
    if (!isTypedResult(output)) {
      return { ok: false, error: { kind: 'runtime', message: 'WASM run 返回了不可序列化的值' } };
    }
    return { ok: true, output };
  } catch (error) {
    return { ok: false, error: { kind: 'runtime', message: String(error) } };
  }
}
