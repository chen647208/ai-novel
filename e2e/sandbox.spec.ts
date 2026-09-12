import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { cleanupUserDataDir, launchApp } from './helpers';

/**
 * 插件沙箱端到端：验证主进程 utilityProcess + QuickJS 真链路。
 * 用户数据隔离：--user-data-dir 指临时目录。
 */

interface SandboxApi {
  pluginSandboxRun: (request: unknown) => Promise<unknown>;
}

test('沙箱：隔离进程内执行并回传结果', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hongyue-e2e-sandbox-'));
  const { app, page } = await launchApp(userDataDir);
  try {
    const result = await page.evaluate(
      (req) => (window as unknown as { electronAPI?: SandboxApi }).electronAPI?.pluginSandboxRun(req),
      { code: 'function run(input){ return { doubled: input.n * 2 }; }', input: { n: 21 } },
    );
    expect(result).toEqual({ ok: true, output: { doubled: 42 } });
  } finally {
    await app.close();
    cleanupUserDataDir(userDataDir);
  }
});

test('沙箱：死循环被终止，主进程仍可响应', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hongyue-e2e-sandbox-'));
  const { app, page } = await launchApp(userDataDir);
  try {
    const result = await page.evaluate(
      (req) => (window as unknown as { electronAPI?: SandboxApi }).electronAPI?.pluginSandboxRun(req),
      { code: 'function run(){ for(;;){} }', limits: { timeoutMs: 300 } },
    );
    expect(result).toMatchObject({ ok: false, error: { kind: 'timeout' } });

    // 主进程未被拖垮：后续调用正常
    const after = await page.evaluate(
      (req) => (window as unknown as { electronAPI?: SandboxApi }).electronAPI?.pluginSandboxRun(req),
      { code: 'function run(input){ return input.a + input.b; }', input: { a: 3, b: 4 } },
    );
    expect(after).toEqual({ ok: true, output: 7 });
  } finally {
    await app.close();
    cleanupUserDataDir(userDataDir);
  }
});
