import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';
import { cleanupUserDataDir, createBook, launchApp } from './helpers';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

interface AxeNode { target: unknown }
interface AxeViolation { id: string; impact?: string | null; help: string; nodes: AxeNode[] }

/**
 * 无障碍审计（棘轮门禁）：首启建书进入工作台后跑 axe，拦截任何 serious/critical 问题。
 */
test('工作台通过 axe 棘轮审计', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hongyue-a11y-'));
  const { app, page } = await launchApp(userDataDir);
  try {
    await createBook(page);
    await page.addScriptTag({ content: axeSource });
    const violations = (await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (ctx: Document, opts: unknown) => Promise<{ violations: unknown[] }> } }).axe;
      const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
      return result.violations;
    })) as AxeViolation[];

    const blocking = violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
      '出现新的 axe serious/critical 无障碍问题',
    ).toEqual([]);
  } finally {
    await app.close();
    cleanupUserDataDir(userDataDir);
  }
});
