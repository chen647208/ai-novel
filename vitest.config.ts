import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * 单元测试配置：node 环境，测试与被测代码同目录（__tests__）。
 * 涉及 window/electronAPI 的服务测试通过显式 mock 完成。
 * resolve.alias 与 vite.config.ts 保持一致，使 @/ 等别名在测试中同样可解析。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src/renderer'),
      '@shared': path.resolve(rootDir, 'src/shared'),
      '@assets': path.resolve(rootDir, 'src/assets'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    globals: false,
    setupFiles: [path.resolve(rootDir, 'src/renderer/i18n/vitest-setup.ts')],
  },
});
