import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

/**
 * 工作台主流程断言（无 AI Key 可跑）：
 * 建书 → 灵感区 → 无模型禁用 → 下一步建议 → 分区切换/助手显隐 → 重启持久化。
 * 用户数据隔离：--user-data-dir 指临时目录，绝不碰真实用户数据。
 */

const launchApp = async (userDataDir: string): Promise<{ app: ElectronApplication; page: Page }> => {
  const app = await electron.launch({
    // --lang 固定中文：CI 的 Linux 无头环境默认英文，中文选择器会全灭
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
  await expect(page!.locator('body')).toBeVisible({ timeout: 30_000 });
  return { app, page: page! };
};

const createBook = async (page: Page): Promise<void> => {
  // 首启向导：点"跳过"建书直达工作台；向导只出现一次
  const skip = page.getByRole('button', { name: /跳过|Skip/ });
  if (await skip.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await skip.click();
  } else {
    // 非首启：顶栏新建经模态，填标题确认
    await page.getByRole('button', { name: /新建书籍|New Book/ }).first().click();
    await page.getByPlaceholder(/例如|e\.g\./).fill('E2E测试书');
    await page.getByRole('button', { name: /^(新建书籍|New Book)$/ }).last().click();
  }
  // 无模型手写豁免弹窗：点"先手写看看"放行
  const handwrite = page.getByRole('button', { name: /先手写看看|Write by hand/ });
  if (await handwrite.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await handwrite.click();
  }
  // 灵感输入框出现 = 已进工作台灵感分区
  await expect(page.getByPlaceholder(/输入你的初始灵感|Enter your initial inspiration/)).toBeVisible({ timeout: 30_000 });
};

test('建书进工作台：无模型时生成按钮禁用，手写不受影响', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hongyue-e2e-flow-'));
  const { app, page } = await launchApp(userDataDir);
  try {
    await createBook(page);
    const input = page.getByPlaceholder(/输入你的初始灵感|Enter your initial inspiration/);
    await input.fill('魔法学院的普通学生发现特殊能力');
    await expect(input).toHaveValue(/魔法学院/);
    // 填了灵感仍禁用 = 无模型拦截生效（非空输入排除）
    await expect(page.getByRole('button', { name: /生成书名与简介|Generate Title/ })).toBeDisabled();
  } finally {
    await app.close();
  }
});

test('填灵感后出现下一步建议；Ctrl+J 开关助手，Ctrl+2 切世界分区', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hongyue-e2e-flow-'));
  const { app, page } = await launchApp(userDataDir);
  try {
    await createBook(page);
    await page.getByPlaceholder(/输入你的初始灵感|Enter your initial inspiration/).fill('魔法学院的普通学生发现特殊能力');
    await expect(page.getByText(/建议下一步|Suggested next/).first()).toBeVisible({ timeout: 15_000 });
    // 建议顺序与左侧导航同序：灵感之后是世界
    await expect(page.getByText(/世界构建|World Building/).first()).toBeVisible({ timeout: 15_000 });

    // Ctrl+J 显隐 AI 助手栏（默认展开：先关再开）
    await page.keyboard.press('Control+j');
    await expect(page.getByText(/AI 助手|AI Assistant/).first()).toBeHidden({ timeout: 15_000 });
    await page.keyboard.press('Control+j');
    await expect(page.getByText(/AI 助手|AI Assistant/).first()).toBeVisible({ timeout: 15_000 });

    // Ctrl+2 切世界分区
    await page.keyboard.press('Control+2');
    await expect(page.getByText(/知识库|世界构建|Knowledge|World Building/).first()).toBeVisible({ timeout: 15_000 });
  } finally {
    await app.close();
  }
});

test('同一数据目录重启后书籍仍在（持久化回归）', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hongyue-e2e-flow-'));
  const first = await launchApp(userDataDir);
  try {
    await createBook(first.page);
    await first.page.getByPlaceholder(/输入你的初始灵感|Enter your initial inspiration/).fill('持久化回归测试灵感');
    // 等落盘：persistenceBridge 差分写盘，给 3 秒
    await first.page.waitForTimeout(3_000);
  } finally {
    await first.app.close();
  }

  const second = await launchApp(userDataDir);
  try {
    // 书籍恢复成功：工作台直达或书籍库见书卡；点进去灵感正文也在
    const input = second.page.getByPlaceholder(/输入你的初始灵感|Enter your initial inspiration/);
    if (!await input.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(second.page.getByText(/新小说|New Novel/).first()).toBeVisible({ timeout: 30_000 });
      await second.page.getByText(/新小说|New Novel/).first().click();
    }
    // 豁免弹窗可能延迟出现，断言前即时放行（不出现则忽略）
    await second.page.getByRole('button', { name: /先手写看看|Write by hand/ }).click({ timeout: 20_000 }).catch(() => {});
    await expect(second.page.getByText(/持久化回归测试灵感/).first()).toBeVisible({ timeout: 30_000 });
  } finally {
    await second.app.close();
  }
});
