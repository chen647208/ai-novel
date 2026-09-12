# 01 现状评估（基于 2026-08-31 代码实测）

> 本文只陈述事实与证据，全部来自当前仓库代码。目标设计见 02–08 篇。
> 版本 v1.0.0 ｜ 许可证 AGPL-3.0-only ｜ 约 34,850 行纯代码（renderer 94%）。

## 1. 技术栈事实

| 层 | 现状 | 证据 |
|---|---|---|
| 桌面壳 | Electron（主进程仅 687 行：文件 IO、对话框、`db:*` 裸 SQL IPC、`vector:*` IPC、logger） | `src/main/` 5 文件 |
| UI | React 19 + TypeScript strict + Vite + Tailwind v4 + Radix UI | package.json |
| i18n | i18next，zh/en 双语，语言/主题持久化在 AppState | `src/renderer/i18n/`、types.ts L695-700 |
| 状态 | **无 store 库**：App.tsx（683 行）useState 根组件，props 下钻，步骤式工作流（灵感→人物→大纲→章节大纲→写作） | `src/renderer/app/App.tsx` |
| 编辑器 | **裸 `<textarea>`**（WritingEditorCanvas），外层 1174 行编排组件 + 工具栏/侧栏/覆盖层 | `src/renderer/features/writing/` |
| AI | AIService 静态门面 + 5 适配器（openai-chat/responses/anthropic/gemini/ollama）+ sse/retry/json/messages | `src/renderer/shared/services/ai/` |
| 向量 | vectra + 本地/API embedding 双路；`vector:*` IPC 走主进程 | knowledge/settings services |
| 存储 | **三后端 StorageRepository**：Electron→better-sqlite3-multiple-ciphers(IPC)、浏览器→sqlite-wasm(OPFS)、兜底→JSON(localStorage)；schema v1 = 文档行 + FTS5 trigram；版本化 MIGRATIONS；AutoBackupService | `src/renderer/shared/services/repository/` |

## 2. 数据模型事实

`AppState`（全量状态）：

```
AppState { projects[], activeProjectId, models[], activeModelId,
           embeddingModels[], activeEmbeddingModelId, prompts[],
           cardPrompts[], consistencyPrompts[], consistencyCheckConfig,
           language?, theme? }

Project { id, title, inspiration, intro, outline,
          characters[], chapters[], virtualChapters[], knowledge[],
          worldView?, locations[], factions[], timeline?, ruleSystems[],
          foreshadows[], lastModified }
```

- 领域类型已相当丰富：MagicSystem/MagicLevel、TechnologyLevel、WorldHistory/HistoryEvent/HistoryDate、Faction、RuleSystem/RuleLevel、CharacterBirthInfo、Foreshadow（planted/paid-off/abandoned × minor/major/critical）、GraphNode/GraphLink（6 种布局）、ConsistencyCheck 全套。
- **类型文件双轨**：`shared/types.ts`（1033 行 72 导出）与拆分后的 `shared/types/*`（index.ts re-export 10 个域文件）并存——迁移做了一半。
- 数据关系全部是**数组内嵌**（chapters 里嵌 content 字符串），无外键、无引用索引；`virtualChapters` 是为"虚拟章节"打的平行存储补丁——多视图需求已经用土办法显形。

## 3. 服务能力清单（44 个 service，11,825 行）

| 域 | 代表服务（行数） | 职责 |
|---|---|---|
| 存储 | storage.ts(744)、repository/*(~1000)、autoBackupService(218) | 读写、备份、导入导出 |
| AI 调用 | ai/adapters/*(~950)、retry/sse/json/messages | 多供应商流式调用 |
| AI 编排 | aiContextBuilder(454)、smartRecommendationService(592)、aiSemanticCheckService(404)、consistencyCheckPromptService(212) | 上下文拼装、推荐、语义检查 |
| 卡片 | cardPromptService(626)、aiCardCreationService(532)、cardFieldValidator(318)、aiCardCommandService(131) | AI 生成卡片 + 校验 |
| 向量 | vectorService(584)、embeddingService(560)、embeddingModelService(498)、vectorIntegrationService(472)、apiEmbeddingService(335)、simpleVectorStore(180)、vectorSimilarityService(525) | 嵌入 + 检索（**7 个服务做一件事，明显冗余**） |
| 世界观 | worldConsistencyService(544) | 一致性 |
| 伏笔 | foreshadowService(170) | 埋设/回收/超期 |
| 写作 | summaryExtractionService(115)、writingStatsService(83)、chapterSnapshotService(77) | 摘要/统计/快照 |

## 4. 工程基建事实

- **CI**：`ci.yml`（lint → typecheck:all → test → build 校验）+ `release.yml`（tag 触发发布）；`npm run verify` 本地等价物存在。
- **测试**：28 个测试文件（vitest），覆盖 storage/ai/repository/app 等。
- **许可证治理**：`scripts/add-license-headers.mjs` + `headers:check` 强制每文件 AGPL 头；`docs/guides/licensing.md`。
- **打包**：electron-builder（win/mac/linux 三平台脚本齐）。

## 5. 与目标蓝图（10 篇架构总纲）的差距矩阵

| 蓝图要求 | 现状 | 差距等级 |
|---|---|---|
| 六实体通用模型 | 文档 JSON 内嵌数组 | ★★★ 核心重构 |
| 纯文本为源（可 Git） | SQLite 文档行 + JSON 兜底 | ★★★ |
| 引用索引（软/硬边） | 无；virtualChapters 是症状 | ★★★ |
| 插件系统 | 无 | ★★★ |
| 编辑器内核（PM/CM） | textarea | ★★★ |
| AI 工具化/技能化 | 硬编码 prompt service ×4 | ★★ |
| 单一变更管线 + Revision | 快照服务（手动式） | ★★ |
| Build Profile 导出 | 单路径导出（TXT/MD/HTML） | ★★ |
| 服务层 API-first | repository 抽象已起步（好基础） | ★ |
| Provider 容器主进程 | 687 行裸 IPC | ★（趁小立规矩） |
| i18n/主题/CI/许可证治理 | **已达标** | — |
| 多模型适配器 | **已达标**（5 家流式） | — |

## 6. 对迁移计划粗排（11 篇）的两处修正（本文实测）

1. **WP0.2 在现有存储上扩展**：`StorageRepository` + `SqlDriver` + `MIGRATIONS` + FTS5 已存在且设计良好（"文档行+FTS"混合模型是刻意的 Phase 0）。迁移路径为：**schema v1（文档行）→ v2（实体行 + entity_changes）**，在同一抽象上扩展。
2. **向量层需要合并**：7 个向量/embedding 服务应收敛为 1 个 `EmbeddingProvider` + 1 个 `VectorIndex`（并入索引器），这是 P0 顺带的减脂项。

## 7. 结论

这个项目的真实底色是：**领域建模有野心（世界观/伏笔/一致性/图谱类型都定义过）、工程基建扎实（CI/测试/许可证/i18n）、但数据与扩展机制停在 1.0（文档 JSON + textarea + 硬编码 AI）**。设计方向是把已有的领域概念装进"实体+索引+插件"的新地基——大量已定义的类型（MagicSystem、Faction、RuleSystem…）恰好证明"类型注册表"是刚需：它们每个都是未来类型模板的一个实例。
