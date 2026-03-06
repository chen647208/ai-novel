# 项目结构说明

## 结构总览

当前仓库已经完成主线结构收口，核心目录如下：

- `src/main`：Electron 主进程代码
- `src/renderer/app`：应用入口与壳层编排
- `src/renderer/constants`：渲染层专用常量
- `src/renderer/features`：按业务能力拆分的功能域代码
- `src/renderer/shared`：渲染层共享服务
- `src/shared`：跨进程共享类型与常量
- `src/assets`：图标与静态资源
- `docs`：中文文档

## 入口关系

- 渲染进程入口：`src/renderer/index.tsx`
- 应用壳层入口：`src/renderer/app/App.tsx`
- 左侧导航入口：`src/renderer/app/app-shell/Sidebar.tsx`
- 主进程入口：`src/main/main.js`
- 预加载脚本：`src/main/preload.js`

## 功能域划分

- `features/books`：书籍列表、新建与切换
- `features/inspiration`：灵感输入与简介生成
- `features/characters`：人物创建与人物编辑
- `features/outline`：大纲生成与整理
- `features/chapters`：章节细纲与章节规划
- `features/writing`：正文写作、历史记录与导出
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
- 新代码不再新增旧兼容层

## 已完成的结构收口

- `src/renderer/components` 已移除
- `src/renderer/services` 已移除
- `src/renderer/types.ts` 已移除
- `src/renderer/constants.tsx` 已移除
- 当前渲染层主线统一为 `app + constants + features + shared`

## 产物目录约定

- `build/renderer`：前端构建产物
- `build/main`：Electron 主进程构建产物
- `build/release`：安装包与发布产物
