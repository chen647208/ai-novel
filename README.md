# AI 小说创作助手

这是一个以本地优先为核心的 Electron + React + TypeScript 桌面应用，面向小说创作场景，支持书籍管理、灵感生成、人物构建、大纲设计、章节规划、伏笔追踪、知识库管理与正文写作。

![CI](https://github.com/chen647208/ai-novel/actions/workflows/ci.yml/badge.svg)

## 技术栈

- Electron 39
- React 19
- TypeScript（渲染层与主进程均 strict）
- Vite 6
- Tailwind CSS 4
- electron-builder
- vitest（单元测试）

## 特性亮点

- 多 Provider AI：Gemini（原生 + OpenAI 兼容端点）、OpenAI 兼容、Ollama，统一适配器架构
- 流式生成、可取消（停止生成）、瞬时失败自动重试、结构化 JSON 输出
- 沉浸式写作：编辑快照自动保存与恢复、字数/全书统计、专注模式、多格式导出（TXT/Markdown/HTML）
- 伏笔追踪：埋设/回收/超期管理，AI 自动检测本章回收，并在生成时注入未回收伏笔
- 知识库向量检索、世界观图谱、时间线、一致性检查、全局助手

## 当前目录结构

```text
src/
  main/                       # Electron 主进程与 preload（TypeScript）
    main.ts                   # 窗口、安全策略、文件/对话框 IPC
    preload.ts                # contextBridge 暴露的语义化 API
    channels.ts               # IPC 通道常量
    logger.ts                 # 文件日志
    vector-ipc.ts             # Vectra 向量索引 IPC 托管
    tsconfig.json             # 主进程（NodeNext/ESM）
    tsconfig.preload.json     # 预加载（CommonJS）
  renderer/
    app/                      # 应用入口、壳层、初始化状态
    constants/                # 渲染层专用常量
    features/                 # 按功能域组织（books/inspiration/characters/outline/
                              #   chapters/writing/foreshadowing/knowledge/assistant/
                              #   world/timeline/consistency/settings/version）
    shared/
      services/ai/            # AI 调用核心（适配器 + SSE + 重试 + JSON）
      services/storage.ts     # 本地持久化与迁移
      components/             # ErrorBoundary 等共享组件
    index.tsx
  shared/                     # 跨进程共享类型与常量
  assets/                     # 图标与静态资源
build/                        # 构建产物（renderer / main / release）
docs/                         # 中文文档
scripts/                      # 构建辅助脚本
.github/workflows/            # CI 与发布工作流
```

## 核心文档

- `docs/README.md`：文档总览与阅读顺序
- `docs/guides/project-structure.md`：项目结构与分层约定
- `docs/guides/build-and-release.md`：构建、打包与产物说明
- `docs/guides/ci-and-release.md`：CI 与基于标签的发布流程
- `docs/features/ai-layer.md`：AI 调用层架构
- `docs/features/foreshadowing.md`：伏笔追踪

## 常用命令

- `npm run dev`：启动前端开发服务器
- `npm run electron:dev`：启动 Electron 开发模式
- `npm run verify`：本地完整校验（类型检查 + 测试 + 构建），与 CI 一致
- `npm run test`：运行单元测试
- `npm run typecheck:all`：渲染层与主进程类型检查
- `npm run dist:win` / `dist:mac` / `dist:linux`：生成对应平台安装包（x64 + arm64；不含 32 位）

## 发布

确认稳定版本后打 `v*` 标签推送，即触发 GitHub Actions 自动构建三端桌面包并发布 Release。详见 `docs/guides/ci-and-release.md`。

## 关键路径

- 主进程入口：`src/main/main.ts`
- 预加载脚本：`src/main/preload.ts`
- 渲染进程入口：`src/renderer/index.tsx`
- 应用壳层入口：`src/renderer/app/App.tsx`
- AI 调用核心：`src/renderer/shared/services/ai/`
- 渲染层共享存储：`src/renderer/shared/services/storage.ts`
- 共享类型总出口：`src/shared/types.ts`

## 许可与商业授权

本项目采用**双重许可**：

- **社区版**：AGPL-3.0（见 `LICENSE`）。任何分发或衍生（含通过网络/SaaS 提供）都必须以 AGPL-3.0 开源对应源码。
- **商业版**：需要在闭源产品中集成、或提供不公开源码的网络服务，请获取商业授权——联系 **3308786104@qq.com**，协议模板见 `docs/COMMERCIAL-LICENSE.md`。

详见 `docs/guides/licensing.md`。

## 贡献

欢迎贡献！请先阅读 `CONTRIBUTING.md`；所有贡献需签署 `docs/CLA.md`（贡献者保留版权，授予维护者再许可含闭源商用的权利，以支撑双重授权）。
