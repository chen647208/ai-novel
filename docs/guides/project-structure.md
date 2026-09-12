# 项目结构说明

## 结构总览

- `src/main`：Electron 主进程（Provider 容器 + AI 网关 + MCP server，全 TypeScript）
- `src/core`：领域层（entities / dsl / index / project / types-registry / build / sync / plugin / ai），纯 TS 双端可用
- `src/renderer/app`：应用入口、壳层编排、双 store（project/settings）
- `src/renderer/features`：按业务能力拆分的 15 个功能域
- `src/renderer/shared`：渲染层共享基础设施（网关客户端、仓库、UI 组件）
- `src/shared`：跨进程共享类型与 i18n 目录（catalog + locales）
- `sdk`：`@hongyue/plugin-sdk`（MIT 独立发行）
- `vscode-hongyue`：VS Code 线（novelDsl 语法扩展）
- `docs` / `docs-site`：中文文档与 VitePress 文档站
- `profiles`：发行档（minimal / webnovel / literary）
- `.github/workflows`：CI 与发布工作流

## 入口关系

- 渲染进程入口：`src/renderer/index.tsx`（外层包裹 `ErrorBoundary`）
- 应用壳层入口：`src/renderer/app/App.tsx`（书籍库 ⇄ 工作台路由 + 浮层宿主）
- 左侧导航：`src/renderer/app/app-shell/WorkspaceNav.tsx`
- 主进程入口：`src/main/main.ts`（Provider 容器装配；产物 `build/main/main/main.js`，ESM）
- 预加载脚本：`src/main/preload.ts`（产物 `build/main/preload/preload.js`，CommonJS）

## 主进程分层

- `src/main/app/`：容器（`container.ts`）与各 Provider（`providers.ts`：file/dialog/vector/sqlite/window）
- `src/main/ai/`：**AI 网关**——四 Provider 适配器 + sse/retry/messages/resolve + `gateway.ts`（IPC：complete/stream/abort）+ `i18n.ts`
- `src/main/mcp/`：MCP stdio server（外部 agent 平权接入，读资源/工具 + 写提案进待审箱）
- `src/main/channels.ts`：IPC 通道名常量；`sqlite-ipc.ts`：better-sqlite3 托管；`vector-ipc.ts`：Vectra 托管
- 双 tsconfig：`tsconfig.json`（主进程，NodeNext/ESM，rootDir 扩至 `src/`）、`tsconfig.preload.json`（预加载）

## 领域层（src/core/）

- `entities/`：六实体模型与 hash；`dsl/`：开放文本 DSL；`project/`：桥接
- `index/`：全书索引器（标签/引用/线索/伏笔/未解析引用，进程级单例）
- `types-registry/`：类型模板注册表（内置 17 模板 + 插件贡献）
- `ai/`：编排层——PromptAssembler（section 装配）、ToolRegistry、ApprovalBroker/Router、SkillCatalog、AiSession/agentLoop
- `build/`：导出构建管线（select → transform → render）
- `sync/`：同步协议（bundle + 冲突副本合并）与 transport 接口
- `crypto/`：逐条目加密（AES-256-GCM protected session）
- `plugin/`：manifest 校验、PluginHost 运行时、事件总线、PluginContext

## 渲染层共享服务

- `services/ai/gatewayClient.ts`：AI 网关类型化客户端（渲染端唯一出口）
- `services/ai/json.ts`：结构化输出修复循环（validate 不可跨 IPC）
- `services/pluginService.ts`：插件磁盘发现与贡献装配
- `services/syncService.ts`：同步包导出/导入应用
- `services/storage.ts`：本地持久化与迁移；`repository/`：SQLite/JSON/wasm 三后端

## 功能域（15 个，bundle 声明见 `src/core/plugin/bundles.ts`）

books / inspiration / world / characters / outline / chapters / writing /
foreshadowing / knowledge / assistant / timeline / consistency / cards /
settings / version——AI 路径统一经网关与工具注册表，发行档经
`useFeatureAvailability` 控制可用性。

## 分层约定

- 业务专属逻辑优先放在各自 `features/<domain>` 内
- 领域纯逻辑进 `src/core`（不依赖 DOM/Electron）
- 跨进程类型统一收敛到 `src/shared`（相对导入带 `.js` 后缀，NodeNext 兼容）
- 插件间交互只走四条合法通道（design/04 §3.1）：命名空间事件 / 贡献点 / 依赖声明 / 权限代理

## 测试

- 单元测试与被测代码同目录：`**/__tests__/*.test.ts`，由 `vitest.config.ts` 收敛
- core（ai/build/sync/plugin/crypto/entities）与渲染端服务均有测试覆盖

## 产物目录约定

- `build/renderer`：前端构建产物
- `build/main/main/`：主进程产物（入口 `main/main.js`；`shared/` 随编译输出）
- `build/main/preload`：预加载产物
- `build/release`：安装包与发布产物
