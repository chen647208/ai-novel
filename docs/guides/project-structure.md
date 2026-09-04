# 项目结构说明

## 结构总览

- `src/main`：Electron 主进程与预加载（已全部 TypeScript 化）
- `src/renderer/app`：应用入口与壳层编排
- `src/renderer/constants`：渲染层专用常量
- `src/renderer/features`：按业务能力拆分的功能域代码
- `src/renderer/shared`：渲染层共享基础设施（服务、组件）
- `src/shared`：跨进程共享类型与常量
- `src/assets`：图标与静态资源
- `docs`：中文文档
- `.github/workflows`：CI 与发布工作流

## 入口关系

- 渲染进程入口：`src/renderer/index.tsx`（外层包裹 `ErrorBoundary`）
- 应用壳层入口：`src/renderer/app/App.tsx`
- 左侧导航入口：`src/renderer/app/app-shell/Sidebar.tsx`
- 主进程入口：`src/main/main.ts`（编译产物 `build/main/main.js`，ESM）
- 预加载脚本：`src/main/preload.ts`（编译产物 `build/main/preload/preload.js`，CommonJS）

## 主进程分层

- `src/main/main.ts`：窗口创建、安全策略、文件与对话框 IPC
- `src/main/channels.ts`：IPC 通道名常量（主进程与预加载共用）
- `src/main/logger.ts`：按天轮转的文件日志器
- `src/main/vector-ipc.ts`：Vectra 向量索引的 IPC 托管
- 双 tsconfig：`tsconfig.json`（主进程，NodeNext/ESM）、`tsconfig.preload.json`（预加载，CommonJS）

## 渲染层共享服务

- `src/renderer/shared/services/ai/`：AI 调用核心（适配器架构）
  - `sse.ts` 增量 SSE 解析、`retry.ts` 退避重试、`messages.ts` 消息与清洗、
    `adapters/openai-compatible.ts`、`adapters/gemini.ts`、`resolve.ts`、`json.ts`（结构化输出）
  - `AIService`（`features/assistant/services/aiService.ts`）作为门面保留静态 API
- `src/renderer/shared/services/storage.ts`：本地持久化与迁移
- `src/renderer/shared/components/ErrorBoundary.tsx`：全局错误边界

## 功能域划分

- `features/books`：书籍列表、新建与切换
- `features/inspiration`：灵感输入与简介生成
- `features/characters`：人物创建、编辑与关系图
- `features/outline`：大纲生成与整理
- `features/chapters`：章节细纲与章节规划
- `features/writing`：正文写作、AI 历史、编辑快照、统计、导出、专注模式
- `features/foreshadowing`：伏笔追踪（埋设/回收/超期、AI 回收检测、提示词注入）
- `features/knowledge`：知识库与向量检索中心
- `features/assistant`：全局助手与智能推荐
- `features/world`：世界观编辑与图谱
- `features/timeline`：时间线编辑与增强视图
- `features/consistency`：一致性检查与模板管理
- `features/settings`：模型、存储、Embedding 与模板设置
- `features/version`：版本检查与版本历史

## 分层约定

- 业务专属逻辑优先放在各自 `features/<domain>` 内
- 只在多个功能域通用时，才放到 `src/renderer/shared`
- 跨进程通用类型与常量统一收敛到 `src/shared`
- 新代码不再新增旧兼容层；新版严格更优时直接替换旧实现

## 测试

- 单元测试与被测代码同目录：`**/__tests__/*.test.ts`，由 `vitest.config.ts` 收敛
- 纯逻辑服务（AI 核心、快照、统计、伏笔、卡片校验、存储往返）均有测试覆盖

## 产物目录约定

- `build/renderer`：前端构建产物
- `build/main`：主进程构建产物（含 `build/main/preload`）
- `build/release`：安装包与发布产物
