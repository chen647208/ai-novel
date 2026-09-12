import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { cleanupUserDataDir, createBook, launchApp } from './helpers';

/**
 * 书库批量管理端到端：进入多选 → 全选 → 批量删除（落回收站）。
 * 覆盖新增的选择态 UI 与悬浮操作条。
 */
test('书库批量管理：多选全选后批量删除入回收站', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hongyue-batch-'));
  const { app, page } = await launchApp(userDataDir);
  try {
    await createBook(page);
    await page.getByRole('button', { name: /书籍库|Bookshelf/ }).first().click();

    await page.getByRole('button', { name: /批量管理|Select/ }).first().click();
    await page.getByRole('button', { name: /^全选$|^Select all$/ }).click();
    await expect(page.getByText(/已选 1 本|1 selected/)).toBeVisible();

    await page.getByRole('button', { name: /^删除$|^Delete$/ }).last().click();
    await expect(page.getByText(/确定删除所选/)).toBeVisible();
    await page.getByRole('button', { name: /^确定$|^OK$|^Confirm$/ }).last().click();

    await expect(page.getByText(/还没有书籍|No books yet/)).toBeVisible({ timeout: 15_000 });
  } finally {
    await app.close();
    cleanupUserDataDir(userDataDir);
  }
});
