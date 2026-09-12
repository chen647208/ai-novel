/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 沙箱子进程入口（docs/design/21 §4 的进程隔离层）。
 *
 * 由主进程经 `utilityProcess.fork` 启动；收到的每条消息为 `{ id, request }`，
 * 执行后回 `{ id, result }`。插件代码崩溃/OOM 只影响本进程。
 */

import type { SandboxRunRequest, SandboxRunResult } from '../../../shared/sandbox.js';
import { runQuickJS } from './quickjsRunner.js';
import { runWasm } from './wasmRunner.js';

interface ParentPortLike {
  on(event: 'message', listener: (event: { data: unknown }) => void): void;
  postMessage(message: unknown): void;
}

const parentPort = (process as NodeJS.Process & { parentPort?: ParentPortLike }).parentPort;

if (parentPort) {
  parentPort.on('message', (event) => {
    const payload = event.data as { id?: string; request?: SandboxRunRequest } | undefined;
    const id = payload?.id ?? '';
    const request = payload?.request;
    if (!request) {
      parentPort.postMessage({ id, result: { ok: false, error: { kind: 'runtime', message: '缺少请求' } } });
      return;
    }
    const execute = request.mode === 'wasm' ? runWasm : runQuickJS;
    void execute(request)
      .then((result) => parentPort.postMessage({ id, result }))
      .catch((error: unknown) =>
        parentPort.postMessage({
          id,
          result: { ok: false, error: { kind: 'runtime', message: String(error) } } satisfies SandboxRunResult,
        }),
      );
  });
}
