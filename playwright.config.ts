import { defineConfig } from '@playwright/test';

/**
 * E2E：Electron 启动冒烟 + 工作台主流程断言（无 AI Key 可跑）。
 * webServer 起 vite（与 electron:dev 同端口），用例再起 electron .（开发模式）。
 * 不下载 Playwright 浏览器：只用仓库自带 electron 二进制（见 CI 的 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD）。
 */
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 120_000,
  reporter: 'line',
  // flaky 治理：CI 重试 2 次，首败留 trace
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --port 3000 --strictPort',
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
