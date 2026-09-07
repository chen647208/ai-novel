# 项目文档索引

> 本文件曾是项目的完整说明文档，但与 `README.md` 和 `docs/` 内容重复且长期漂移。
> 现收敛为索引：具体、最新的事实以 `README.md` 与 `docs/` 为准，避免多处维护导致不一致。

## 项目定位

红月创作（Hongyue Creation）是一个本地优先的 Electron + React + TypeScript 桌面应用，面向小说创作全流程：书籍管理、灵感生成、人物构建、大纲设计、章节规划、伏笔追踪、知识库检索与正文写作。AI 能力支持 DeepSeek、Kimi、GLM、通义千问、MiniMax、Gemini、Claude、GPT 与 Ollama 本地模型。

## 权威文档入口

| 主题 | 文档 |
| --- | --- |
| 概览、技术栈、命令、目录结构 | `README.md` |
| 文档总览与阅读顺序 | `docs/README.md` |
| 项目结构与分层约定 | `docs/guides/project-structure.md` |
| 构建、打包与产物 | `docs/guides/build-and-release.md` |
| CI 与标签发布 | `docs/guides/ci-and-release.md` |
| 许可证与商业授权 | `docs/guides/licensing.md` |
| AI 调用层架构 | `docs/features/ai-layer.md` |
| 伏笔追踪 | `docs/features/foreshadowing.md` |
| 主创作流程 / 写作 / 知识库 / 助手 / 世界观 / 设置 / 版本 | `docs/features/*.md` |
| 变更历史 | `CHANGELOG.md` |
| 使用指南 | `USER_GUIDE.md` |

## 快速上手

```bash
npm install            # 安装依赖（中国大陆可用 --registry=https://registry.npmmirror.com）
npm run electron:dev   # 开发模式（Vite + Electron）
npm run verify         # 单链全门禁：lock 预检 + lint + typecheck + 覆盖率测试 + 许可头 + 密钥扫描 + 构建（与 CI 同一条链）
npm run dist:win       # 生成 Windows 安装包（另有 dist:mac / dist:linux）
```

## 发布

确认稳定版本后打 `v*` 标签推送，GitHub Actions 自动构建三端桌面包并发布 Release，详见 `docs/guides/ci-and-release.md`。

## 许可证

社区版 AGPL-3.0，商业使用可获取专有授权（双重许可），详见 `docs/guides/licensing.md` 与 `LICENSE`。
