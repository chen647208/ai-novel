# ai-novel v2 设计文档索引

> 生成于 2026-08-31 ｜ 依据：当前代码实测（01 篇）+ 九项目调研拆解（novelWriter/Zettlr/Trilium/Twine/Manuskript/bibisco/codex/deepseek-harness/编辑器内核与插件规范；调研归档于 git 历史 research/ 目录）。
> **性质声明**：本目录是目标设计（前瞻性），与 `docs/features/`（现状描述）分工不同；功能落地后应把对应设计回写进 features 文档。

## 阅读顺序

1. **[01 现状评估](01-current-state.md)** — 一切从实测出发：技术栈、数据模型、44 个服务、与蓝图的差距矩阵
2. **[02 目标架构](02-target-architecture.md)** — 进程模型、core 分层与导入边界、目标目录树、状态管理决策
3. **[03 数据层](03-data-layer.md)** — 六实体、类型注册表（首批 17 模板）、开放文本 DSL、索引器、schema v2、迁移框架
4. **[04 插件系统](04-plugin-system.md)** — manifest v0、9 类贡献点、生命周期与故障隔离、命名空间、沙箱、bundle/profile/patch
5. **[05 AI 层](05-ai-layer.md)** — 工具注册表（10 内置工具）、写法技能引擎、审批三档、会话事件流、MCP 双向
6. **[06 编辑器与 UI](06-editor-and-ui.md)** — TipTap+CM6 双内核、单一变更管线、8 个写作原语、UI 宪法、应用壳
7. **[07 导出](07-export-build.md)** — Build Profile 四命名空间、选择→变换→渲染管线、插件渲染器
8. **[08 路线图](08-roadmap.md)** — M0–M5 工作包分解、退出标准、横切策略、风险登记（**取代 11 篇的迁移粗排**）

## 一页纸总览

```
现状：textarea + 单文档 JSON(已有 repository 抽象) + 硬编码 AI + 683 行 useState 根组件
目标：六实体+类型注册表(数据) → DSL 文件为源+索引缓存(存储) → 双内核+事务管线(编辑)
      → 工具+技能+审批( AI ) → manifest+贡献点+隔离运行时(插件) → bundle/profile 发行(生态)
路径：M0 数据地基 → M1 编辑器 → M2 AI → M3 插件化(v2.0) → M4 表面 → M5 生态
不变：i18n/主题/Radix/Tailwind/CI/许可证治理/5 模型适配器/repository 抽象 —— 全部保留演进
```

## 五条设计公理（裁决一切争议，出处 10 篇架构总纲）

1. 纯文本为源，索引为缓存
2. 实体极少，语义靠约定
3. 一切变更走单一管线
4. 扩展永远非必需（禁用全部插件/AI 后纯写作完整可用）
5. 规范先于生态
