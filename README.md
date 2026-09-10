# 红月创作（Hongyue Creation）

以本地优先为核心的 Electron + React + TypeScript 桌面小说创作工具——
**既要 AI，也要纯写作**：AI 工具/审批/技能体系与完整的离线写作能力并存，
数据主权在用户（SQLite 单一事务管线 + 开放格式导出）。

![CI](https://github.com/chen647208/hongyue-creation/actions/workflows/ci.yml/badge.svg)

## 技术栈

- Electron 44、React 19、TypeScript（渲染层/主进程均 strict）
- Vite 6、Tailwind CSS 4、TipTap/CodeMirror 6、i18next（中英）
- SQLite（node:sqlite 主进程托管）、Vectra 向量索引、electron-builder、vitest

## 特性亮点

**写作**
- TipTap 正文画布 + CM6 novelDsl 大纲编辑器（@tag 校验波浪线）
- 伏笔追踪（埋设/回收/超期 + AI 检测）、知识库向量检索、世界观图谱、时间线
- 导出构建管线：Build Profile（选择→变换→渲染）三段式，txt/md/html 内置
  渲染器，导出预览 + 成稿字数与统计面板同源；Profile 支持 JSON/YAML 分享
- 逐条目加密：AES-256-GCM 受保护会话，逐章加密/解密

**AI**
- 网关在主进程：API Key 不进渲染端；四 Provider 适配器 + 流式（requestId
  多路推送）+ 取消 + 重试 + 结构化 JSON
- Agent 循环：PromptAssembler 分区装配 → 工具调用（17 个 `core.*` 内置工具，
  插件可贡献）→ 三档审批（建议/改写/直接；超时降级待审箱，绝不静默应用）
- 写法技能：SKILL.md 渐进注入（黄金三章/雪片法/POV/伏笔回收/AI 味消除，
  内置 5 个，社区可分发）
- 会话事件流：全程 jsonl 留痕、可回放可审计；MCP 双向（外部 agent 与
  内置助手平权，写操作走同一审批管线）

**插件与同步**
- manifest v0 声明式贡献点（skills/types/buildProfiles/hooks）、依赖拓扑
  激活、故障隔离、unwind 不变量、权限 deny-by-default、交互命名空间强制
- 插件状态面板 + 发行档（完整/网文/严肃文学/纯写作；minimal 即时禁用
  全部 AI）+ 装配树查看器；MIT SDK（`sdk/`）独立发行
- 同步地基：entity_changes bundle 导出/导入 + 冲突副本合并（LWW 禁用）

## 目录结构

```text
src/
  main/                    # Electron 主进程（Provider 容器：sqlite/vector/file/dialog/ai-gateway/window）
    ai/                    # AI 网关：适配器 + sse/retry + i18n（build/main/main/ 产物）
    mcp/                   # MCP stdio server（外部 agent 平权接入）
  renderer/
    app/                   # 壳层、双 store（project/settings）、持久化桥
    features/              # 功能域（books/writing/assistant/…15 个）
    shared/services/       # 网关客户端、存储、仓库（SQLite/JSON/wasm 三后端）
    editor/                # TipTap schema/commands/serialization
  core/                    # 领域层：entities/dsl/index/build/sync/plugin/ai（纯 TS，双端可用）
  shared/                  # 跨进程类型与 i18n 目录（catalog + locales）
sdk/                       # @hongyue/plugin-sdk（MIT 独立发行）
docs/                      # 中文文档（design/ 蓝图、features/ 说明、guides/ 指南）
docs-site/                 # VitePress 文档站（npm run docs:dev）
vscode-hongyue/          # VS Code 线：novelDsl 语法扩展
```

## 核心文档

- `docs/README.md`：文档总览与阅读顺序
- `docs/design/`：M0–M5 设计蓝图（01 现状 → 08 路线图）
- `docs/features/`：功能说明（ai-layer / assistant / writing / plugins-and-sync / …）
- `docs/guides/acceptance-report.md`：M0–M5 验收报告（逐项标准与证据）

## 常用命令

- `npm run dev` / `npm run electron:dev`：开发模式
- `npm run verify`：本地完整校验（lock 预检 + lint + 类型 + 测试覆盖率 + 许可头 + 密钥扫描 + 双端构建），与 CI 一致
- `npm run docs:dev` / `docs:build`：文档站本地预览 / 静态构建
- `npm run dist:win` / `dist:mac` / `dist:linux`：平台安装包（x64 + arm64）

## 关键路径

- 主进程入口：`src/main/main.ts`（Provider 容器装配）
- AI 网关：`src/main/ai/gateway.ts`；渲染端客户端：`src/renderer/shared/services/ai/gatewayClient.ts`
- 编排层（工具/审批/会话/技能/装配）：`src/core/ai/`
- 插件运行时：`src/core/plugin/`；构建管线：`src/core/build/`；同步协议：`src/core/sync/`

## 发布

确认稳定版本后打 `v*` 标签推送，触发 GitHub Actions 自动构建三端桌面包并发布 Release。详见 `docs/guides/ci-and-release.md`。

## 许可与商业授权

双重许可：社区版 **AGPL-3.0**（含网络/SaaS 使用）；商业闭源集成请联系
**3308786104@qq.com**，协议模板见 `docs/COMMERCIAL-LICENSE.md`，
详见 `docs/guides/licensing.md`。

## 贡献

欢迎贡献！请先阅读 `CONTRIBUTING.md`；所有贡献需签署 `docs/CLA.md`。
