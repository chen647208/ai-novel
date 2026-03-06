# AI 小说创作助手

这是一个以本地优先为核心的 Electron + React + TypeScript 桌面应用，面向小说创作场景，支持书籍管理、灵感生成、人物构建、大纲设计、章节规划、知识库管理与正文写作。

## 技术栈

- Electron 39
- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- electron-builder

## 当前目录结构

```text
src/
  main/                       # Electron 主进程与 preload 源码
    main.js
    preload.js
    tsconfig.json
  renderer/
    app/                      # 应用入口、应用壳层、初始化状态
      App.tsx
      initialState.ts
      app-shell/
    constants/                # 渲染层专用常量
    features/                 # 按功能域组织的前端代码
      assistant/
      books/
      cards/
      chapters/
      characters/
      consistency/
      inspiration/
      knowledge/
      outline/
      settings/
      timeline/
      version/
      world/
      writing/
    shared/                   # 渲染层共享基础设施
      services/
    index.tsx
    index.css
    index.html
  shared/                     # 跨进程共享类型与常量
    constants/
    types/
    constants.tsx
    types.ts
  assets/                     # 图标与静态资源
build/
  renderer/                   # 前端构建输出
  main/                       # Electron 主进程构建输出
  release/                    # 打包产物输出
docs/                         # 中文文档
```

## 核心文档

- `docs/README.md`：文档总览与阅读顺序
- `docs/guides/project-structure.md`：项目结构与分层约定
- `docs/guides/build-and-release.md`：构建、打包与产物说明
- `docs/features/workflow.md`：从书籍创建到章节规划的主流程说明
- `docs/features/writing.md`：正文写作与历史记录说明
- `docs/features/knowledge.md`：知识库与向量检索说明
- `docs/features/assistant.md`：全局助手与推荐说明
- `docs/features/world.md`：世界观、时间线与一致性说明
- `docs/features/settings.md`：模型、模板与存储设置说明
- `docs/features/version.md`：版本检查与更新说明

## 常用命令

- `npm run dev`：启动前端开发服务器
- `npm run build`：构建渲染进程到 `build/renderer`
- `npm run build:electron`：构建 Electron 主进程到 `build/main`
- `npm run electron:dev`：启动 Electron 开发模式
- `npm run electron:build`：构建前端与 Electron 主进程
- `npm run electron:build-win`：生成 Windows 安装包到 `build/release`
- `npm run electron:build-mac`：生成 macOS 安装包到 `build/release`
- `npm run electron:build-linux`：生成 Linux 安装包到 `build/release`

## 关键路径

- 主进程入口：`src/main/main.js`
- 预加载脚本：`src/main/preload.js`
- 渲染进程入口：`src/renderer/index.tsx`
- 应用壳层入口：`src/renderer/app/App.tsx`
- 渲染层共享存储：`src/renderer/shared/services/storage.ts`
- 共享类型总出口：`src/shared/types.ts`
- 共享常量总出口：`src/shared/constants.tsx`

