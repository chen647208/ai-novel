# 文档总览

本目录用于记录当前项目的真实结构、功能模块与构建发布方式。
所有文档均以当前代码为准，目标是帮助后续维护时快速定位入口、职责和边界。

## 阅读顺序

### 1. 先看整体

- `guides/project-structure.md`：项目分层、主线结构与目录约定
- `guides/build-and-release.md`：构建命令、产物位置与打包说明

### 2. 再看核心功能

- `features/workflow.md`：从书籍创建到灵感、人物、大纲、章节的主创作流程
- `features/writing.md`：正文写作、历史记录、写作弹层与编辑器结构
- `features/knowledge.md`：知识库、向量检索与世界构建中心
- `features/assistant.md`：全局助手、智能推荐与上下文分析
- `features/world.md`：世界观、时间线与一致性检查相关能力
- `features/settings.md`：模型、Embedding、提示词和存储设置
- `features/version.md`：版本信息、更新检查与版本历史

## 当前文档范围

- 文档只覆盖当前仓库里已经存在并在主线中使用的结构
- 已移除的兼容层不会再单独保留说明文档
- 如代码继续调整，优先更新本目录和 `README.md`

## 文档维护约定

- 文档默认使用中文
- 文档内容以“真实代码路径 + 职责说明 + 维护建议”为主
- 不写与当前仓库不符的计划性描述
- 不把整理日志放回 `docs/plans`
