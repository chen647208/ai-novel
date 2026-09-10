import { defineConfig } from '@playwright/test';

/**
 * 打包冒烟 E2E：启动已打包应用（不依赖 vite webServer）。
 * 需设置 HONGYUE_PACKAGED_EXE 指向可执行文件，例如 Windows：
 *   HONGYUE_PACKAGED_EXE=build/release/win-unpacked/红月创作.exe npm run test:e2e:packaged
 */
export default defineConfig({
  testDir: 'e2e-packaged',
  workers: 1,
  timeout: 120_000,
  reporter: 'line',
});
