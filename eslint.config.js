// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const featuresDir = path.join(rootDir, 'src/renderer/features');
const featureNames = fs.existsSync(featuresDir)
  ? fs.readdirSync(featuresDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];

/**
 * 跨 feature 边界（design/02 §2）：只准走 core 契约或事件总线，禁止直接 import 对方实现。
 * 现状为 warn（存量 7 处待收编），收编完成后升为 error。
 */
const featureBoundaryRules = featureNames.map((name) => ({
  files: [`src/renderer/features/${name}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: featureNames
              .filter((other) => other !== name)
              .flatMap((other) => [`@/features/${other}`, `@/features/${other}/*`, `@/features/${other}/**`]),
            message: '跨 feature 引用请走 core 契约或事件总线，禁止直接 import 对方实现',
          },
        ],
      },
    ],
  },
}));

export default tseslint.config(
  {
    ignores: [
      'build/**',
      'node_modules/**',
      'dist/**',
      '*.config.js',
      '*.config.ts',
      'scripts/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // 类型纪律
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-empty-object-type': 'warn',

      // 通用纪律（渲染层日志唯一出口是 shared/utils/logger.ts，该文件自带豁免注释）
      'no-console': 'error',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-debugger': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],

      // React Hooks（正确性关键）
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // 主进程：允许 console（Electron 主进程日志），其余同样严格
  {
    files: ['src/main/**/*.ts'],
    ignores: [],
    plugins: {},
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // 平台无关内核（src/core）：架构边界 —— 只依赖 shared 纯类型，禁止反向依赖渲染层/主进程
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/*'], message: 'core 不得依赖渲染层（@/ 别名）' },
            { group: ['@assets/*'], message: 'core 不得依赖资源层' },
            { group: ['**/renderer/**', '**/main/**'], message: 'core 不得依赖渲染层/主进程实现' },
            { group: ['electron', 'electron/*'], message: 'core 不得依赖 Electron' },
            { group: ['react', 'react/*', 'react-dom', 'react-dom/*'], message: 'core 不得依赖 React/DOM' },
          ],
        },
      ],
    },
  },

  // 测试文件：放宽部分规则（断言、console、any 在测试中是惯用写法）
  {
    files: ['src/**/__tests__/**/*.ts', 'src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // 跨 feature 边界（warn，收编后升级 error）
  ...featureBoundaryRules,
);
