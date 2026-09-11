/**
 * 架构依赖护栏（dependency-cruiser）：循环依赖 + 分层方向。
 * 只扫 src，排除测试与 e2e。规则失败即 error，供 npm run verify 调用。
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: '禁止模块循环依赖（含 type-only），保持依赖图为 DAG',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'renderer-shared-no-app',
      comment: 'renderer/shared 是通用层，不得依赖 renderer/app（应用壳与 store）',
      severity: 'error',
      from: { path: '^src/renderer/shared' },
      to: { path: '^src/renderer/app' },
    },
    {
      name: 'core-no-renderer-main',
      comment: 'core 是纯逻辑层，不得依赖渲染层或主进程实现',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: '^src/(renderer|main)' },
    },
    {
      name: 'renderer-no-main',
      comment: '渲染层不得直接依赖主进程实现（只能经 preload 暴露的 API）',
      severity: 'error',
      from: { path: '^src/renderer' },
      to: { path: '^src/main' },
    },
  ],
  options: {
    doNotFollow: { path: '(^|/)node_modules' },
    includeOnly: { path: '^src' },
    exclude: {
      path: '(^|/)(node_modules|__tests__|\\.test\\.|e2e|dist|build)',
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
