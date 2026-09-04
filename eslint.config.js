// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

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

      // 通用纪律
      'no-console': ['error', { allow: ['warn', 'error'] }],
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
);
