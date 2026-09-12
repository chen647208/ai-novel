import { test, expect, _electron as electron, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * 打包产物启动冒烟：验证 electron-builder 产物能起窗口、渲染进程加载成功。
 * 未设置 HONGYUE_PACKAGED_EXE 时跳过，保证常规 `npm run test:e2e` 不受影响。
 */
const exe = process.env.HONGYUE_PACKAGED_EXE ?? '';
test.skip(!exe, 'HONGYUE_PACKAGED_EXE 未设置，跳过打包冒烟');

test('打包应用可启动并显示窗口', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hongyue-packaged-'));
  const app = await electron.launch({
    executablePath: exe,
    // Linux CI 无特权用户命名空间：加 --no-sandbox 仅供无头冒烟
    args: [`--user-data-dir=${userDataDir}`, '--lang=zh-CN', '--no-sandbox'],
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '0', LANG: 'zh_CN.UTF-8', LANGUAGE: 'zh_CN:zh' } as Record<string, string>,
  });
  try {
    const deadline = Date.now() + 60_000;
    let page: Page | null = null;
    while (!page && Date.now() < deadline) {
      page = app.windows().find((w) => !w.url().startsWith('devtools://')) ?? null;
      if (!page) await new Promise((r) => setTimeout(r, 500));
    }
    expect(page, '打包应用窗口未出现').toBeTruthy();
    await expect(page!.locator('body')).toBeVisible({ timeout: 60_000 });
    // 令牌回归：浅色下背景必须是不透明实色（链条断裂会变透明 → 蒙版透出、整屏发灰）
    const bg = await page!.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(250, 250, 249)');
  } finally {
    await app.close();
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch { /* 进程未释放时留下 */ }
  }
});

test('打包应用沙箱可执行（asar 下 fork utilityProcess）', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hongyue-packaged-'));
  const app = await electron.launch({
    executablePath: exe,
    args: [`--user-data-dir=${userDataDir}`, '--lang=zh-CN', '--no-sandbox'],
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '0', LANG: 'zh_CN.UTF-8', LANGUAGE: 'zh_CN:zh' } as Record<string, string>,
  });
  try {
    const deadline = Date.now() + 60_000;
    let page: Page | null = null;
    while (!page && Date.now() < deadline) {
      page = app.windows().find((w) => !w.url().startsWith('devtools://')) ?? null;
      if (!page) await new Promise((r) => setTimeout(r, 500));
    }
    expect(page, '打包应用窗口未出现').toBeTruthy();
    await expect(page!.locator('body')).toBeVisible({ timeout: 60_000 });
    const result = await page!.evaluate(
      (req) =>
        (window as unknown as { electronAPI?: { pluginSandboxRun: (r: unknown) => Promise<unknown> } }).electronAPI?.pluginSandboxRun(req),
      { code: 'function run(input){ return input.n + 1; }', input: { n: 41 } },
    );
    expect(result).toEqual({ ok: true, output: 42 });
  } finally {
    await app.close();
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch { /* 进程未释放时留下 */ }
  }
});
