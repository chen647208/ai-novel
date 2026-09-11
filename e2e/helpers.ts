import { rmSync } from 'node:fs';
import { expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

/**
 * E2E 共用启动与建书助手。
 * 用户数据隔离：--user-data-dir 指临时目录，绝不碰真实用户数据。
 * --lang 固定中文：CI 的 Linux 无头环境默认英文，中文选择器会全灭。
 */
export const launchApp = async (userDataDir: string): Promise<{ app: ElectronApplication; page: Page }> => {
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDir}`, '--lang=zh-CN'],
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '0', LANG: 'zh_CN.UTF-8', LANGUAGE: 'zh_CN:zh' } as Record<string, string>,
  });
  const deadline = Date.now() + 60_000;
  let page: Page | null = null;
  while (!page && Date.now() < deadline) {
    for (const w of app.windows()) {
      if (!w.url().startsWith('devtools://')) {
        page = w;
        break;
      }
    }
    if (!page) await new Promise((r) => setTimeout(r, 500));
  }
  expect(page, '应用窗口未出现（仅有 DevTools）').toBeTruthy();
  // 固定窗口尺寸：CI/无头环境默认窗口过窄会把写作区压成 0 宽，交互失败
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.setSize(1400, 900);
      win.center();
    }
  });
  await expect(page!.locator('body')).toBeVisible({ timeout: 30_000 });
  return { app, page: page! };
};

/** 删除本次运行的隔离数据目录（Electron 未释放时静默跳过，避免阻塞清理）。 */
export const cleanupUserDataDir = (dir: string): void => {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* 进程仍占用时留下，交由系统/后续清理 */
  }
};

/** 建书进工作台灵感分区（首启走向导跳过，非首启走新建模态）。 */
export const createBook = async (page: Page): Promise<void> => {  const skip = page.getByRole('button', { name: /跳过|Skip/ });
  if (await skip.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await skip.click();
  } else {
    await page.getByRole('button', { name: /新建书籍|New Book/ }).first().click();
    await page.getByPlaceholder(/例如|e\.g\./).fill('E2E测试书');
    await page.getByRole('button', { name: /^(新建书籍|New Book)$/ }).last().click();
  }
  const handwrite = page.getByRole('button', { name: /先手写看看|Write by hand/ });
  if (await handwrite.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await handwrite.click();
  }
  await expect(page.getByPlaceholder(/输入你的初始灵感|Enter your initial inspiration/)).toBeVisible({ timeout: 30_000 });
};
