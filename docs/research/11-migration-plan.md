# 迁移计划：从现状到蓝图（P0–P4 工作包分解）

> ⚠️ **已被 [design/08 路线图](../design/08-roadmap.md) 取代**（2026-08-31）：后续实测发现项目已有 StorageRepository 抽象与 schema 迁移框架，工作包与里程碑划分已按实情重排为 M0–M5。本篇保留作调研输入与历史参考。

> 2026-08-31 ｜ 依据：[10 总纲](10-architecture-blueprint.md) 的 P0–P4 路线，落到当前仓库真实代码。
> 现状盘点与目标形态的差距逐条标注出处（01–09 篇）。每个阶段结束都必须可发布（公理 4）。

## 0. 现状诊断（2026-08-31 实测）

| 现状 | 证据 | 违反的公理/红线 |
|---|---|---|
| **全库单文件** `novalist-data.json`（整个 AppState：projects→chapters/knowledge/characters 全内嵌） | `src/renderer/shared/services/storage.ts` | 红线 2（.msk 黑盒）、公理 1（纯文本为源） |
| 迁移逻辑是散落的 `migrateXxx(state)` 函数 + console.log 流水账 | storage.ts 内 `migrateKnowledgeCategories` | 无版本化迁移框架 |
| 主进程极薄：文件读写 + 对话框 + vector IPC，共 687 行 | `src/main/`（channels.ts/main.ts/vector-ipc.ts） | 业务逻辑全在渲染层，无 Provider 骨架（02 篇） |
| IPC 是裸字符串通道表，无类型化命令联合 | `src/main/channels.ts`（12 个通道） | 02 篇 IPCAPI 模式 |
| 44 个 service 散落各 feature，无统一数据访问层 | `src/renderer/features/*/services/` | 公理 3（单一变更管线）、02 篇 FSAL |
| AI 调用硬编码 prompt（aiService/aiContextBuilder/smartRecommendationService） | `src/renderer/features/assistant/services/` | 07 篇工具化/技能化 |
| `shared/types.ts` 单文件 1033 行巨型类型 | `src/shared/types.ts` | 01/03 篇收敛目标 |
| 无引用索引：伏笔/一致性靠各自遍历 | foreshadowing/consistency services | 01 篇索引器 |

**好消息**：主进程薄 = 骨架还没长歪，Provider 容器现在立规矩成本最低；已有 vector-ipc（独立能力进程化雏形）和 AutoBackupService（Revision 的前身）。

## P0 地基（数据模型 + 存储 + 骨架）

**WP0.1 六实体数据模型**（03 篇）
- 新建 `src/core/entities/`：`Node/Edge/Attribute/Revision/Blob` TS 类型 + `hashedProperties` 静态声明（同步哈希字段实体自描述，03 篇 BAttribute 模式）。
- `shared/types.ts` 拆分：15 个 feature 的类型改为"实体 + 类型模板定义"（05 篇 enums.py 的字段清单作为 characters/world/outline 的初始模板，含人物弧线四件套 motivation/goal/conflict/epiphany）。
- 验收：现有 15 类数据全部可表达为 `Node + typeTemplate`；类型注册表 API 有单测。

**WP0.2 存储重构：单 JSON → 书目录 + 索引缓存**（01/03 篇）
- 一本书 = 一个目录：`books/<bookId>/`（章节/卡片为独立 `.md` 文件 + frontmatter，纯文本可 Git）；`index.db`（SQLite，仅缓存，可全量重建）。
- `entity_changes` 表 + `instanceId/agentId` 字段（03 篇），所有写路径必须经过它；乱序写入用骨架实体（03 篇）。
- 迁移框架：版本化 `migrations/` 目录（替代 console.log 函数），一次性把 `novalist-data.json` 导入新格式，**旧文件保留为 `.legacy` 只读备份**。
- 验收：删掉 index.db 后应用能全量重建并正常运行；Git 打开书目录可读可 diff；导入往返测试通过。

**WP0.3 主进程 Provider 骨架**（02 篇）
- `src/main/app/`：`AppServiceContainer` + `ProviderContract{boot/shutdown}`；现有文件 IO/对话框/vector 拆为 `FsProvider/DialogProvider/VectorProvider`；新增 `StoreProvider`（承载 WP0.2）。
- IPC 改造：每 Provider 一通道 + `IPCAPI<T>` 可辨识联合（02 篇），`channels.ts` 退役。
- boot 守卫 + splash 进度（大索引重建时）。
- 验收：渲染层无任何直接 fs 访问；IPC 载荷类型错误编译期报错。

**WP0.4 索引器**（01 篇）
- `src/core/index/`：扫描书目录，提取 `@tag`/引用关键字，产出 tag 索引、引用图（硬链接/软引用二分，04 篇）、字数分桶；增量 `reindexFile(path)`（novelWriter `reIndexHandle` 模式）；索引持久化 + revision 号失效判断。
- consistency/foreshadowing 改为消费索引器输出（删除各自遍历逻辑）。
- 验收：万条目级索引重建 < 2s；单文件编辑增量索引 < 50ms。

**WP0.5 插件规范 v0 RFC**（04/08/09 篇）
- `docs/rfcs/plugin-spec-v0.md`：manifest（09 篇 JSONC 样例为底）+ 宿主版本区间 + 命名空间 + 错误契约（cause 链保留）+ 故障隔离要求 + 权限枚举。**day-1 写进规范：逐插件 try-catch、状态面板、禁用开关**（08 篇 harness 血泪）。
- 验收：内部评审通过；规范含"资源型/逻辑型插件"二分与三类贡献点（类型模板/技能/Build 变换器）的最小定义。

## P1 编辑器内核

**WP1.1 双内核接入**（09 篇）：正文区 TipTap（schema 定义小说文档模型：章/场景/对话/占位符节点）；大纲/DSL 区 CM6（自定义 language：`@tag` 高亮 + 校验波浪线，novelWriter 编辑器体验）。
**WP1.2 单一变更管线**：所有编辑（人/AI/撤销）走 PM transaction；`onTransaction` 钩子接 entity_changes 写入 + Revision 自动留底（AI 改写必存 Revision，红线 7）。
**WP1.3 写作原语扩展**（06 篇）：Enter×3 结构流、占位符+红点、Darlings（带锚点）、幽灵大纲、排印自动修正、按需拼写检查——每个都是独立 TipTap 扩展，**自证扩展 API 够用**。
**WP1.4 UI 宪法落地**（04 篇）：弹窗改默认值（NewBookModal 首当其冲）、全操作可撤销、无模式。
验收：断网/禁用全部 AI 功能后写作流程完整（公理 4 冒烟测试）。

## P2 AI 工具化（07 篇）

**WP2.1 工具注册表**：`aiService/aiContextBuilder/smartRecommendationService/aiSemanticCheckService` 重构为 `ToolSpec`（声明）+ `ToolExecutor`（执行）；内置工具与 MCP 外部工具同管线；prompt 组装拆为 section 装配器（08 篇 system-prompt 包模式）。
**WP2.2 写法技能引擎**：`skills/` 目录 + SKILL.md（name/description frontmatter）+ 渐进式加载（清单注入，按需读全文）；首批技能：黄金三章、雪片法大纲、POV 转换、伏笔回收检查。
**WP2.3 沙箱×审批**（07 篇）：AI 写稿三档（建议/改写/重写）；改写走 diff 预览审批；多表面路由 + 超时降级"仅留痕"（08 篇 ask-user 教训）；审批事件进 entity_changes（agentId 审计）。
**WP2.4 MCP server 出口**：书/章节/卡片/索引暴露为 MCP resources + tools（基于 WP0.3 服务层），codex/Claude 等外部 agent 可平等读写。
验收：一次 AI 改稿全链路留痕（tool call → diff → 审批 → transaction → revision → entity_changes）。

## P3 插件化（08/09 篇）

**WP3.1 插件运行时**：manifest 解析/校验、逐插件隔离加载 + 状态面板、可逆注册（unwind）、命名空间、worker/iframe 沙箱（逻辑型）。
**WP3.2 内置功能 dogfooding**：按依赖顺序把现有 feature 逐个"插件化"（先类型模板类：cards/world/timeline；再流程类：outline/foreshadowing；最后 AI bundle）。内核只留 WP0 的东西。
**WP3.3 组合发行**：bundle/profile/patch（08 篇）；预设 profile：`webnovel`（网文全家桶）/`literary`（出版工作流）/`minimal`；`--dump-config` 式装配树查看器。
**WP3.4 Build Profile 导出**（01 篇）：四命名空间配置（filter/headings/text/format，字段清单照 01 篇实测表）；导出渲染器为插件贡献点；首批渲染器：md/txt/EPUB/HTML。
验收：写一个示例社区插件（新类型模板"魔法体系"+ 一个导出渲染器）不改内核通过。

## P4 生态

- 贡献点全量开放（编辑器扩展/UI 槽位/命令/技能/MCP/hooks/类型模板/Build 变换器/渲染器）。
- 示例插件仓库 + 插件文档站（Figma 教训：文档是生态一半；Twine 教训：规范放仓库内，独立官网会死）。
- 兼容性 CI（宿主版本区间测试）+ 插件状态上报（吸取 harness 社区自建兼容报告的教训，官方提供数据）。
- VS Code 形态支线（06 篇）：核心库 npm 化验证平台无关性。

## 排序与依赖

```
WP0.1 → WP0.2 → WP0.3 → WP0.4   （串行，数据层是全局前置）
WP0.5 与 WP0.x 并行（规范先行，实现按规范走）
P1 依赖 WP0.2/0.4；P2 依赖 WP0.3/0.4 + P1 的 transaction 管线
P3 依赖 P0 全部 + P2（AI 先工具化再进插件框架，避免双重改造）
P4 依赖 P3.2 dogfooding 完成
```

**明确不做**：不保留 `novalist-data.json` 双写兼容（用户级规则：新版更优直接替换，见 WP0.2 一次性导入）；不在 P0 引入同步/多端（entity_changes 只是埋点）；不在 P1 前碰编辑器。

## 风险登记

| 风险 | 缓解 |
|---|---|
| WP0.2 数据迁移丢数据 | 迁移前 AutoBackupService 强制快照 + 导入往返测试 + `.legacy` 保留 |
| 15 个 feature 同时改数据模型，回归面爆炸 | 每 WP 配全功能回归（typecheck+test+build+冒烟，按项目既有约定） |
| TipTap 自定义节点与现有导出/统计耦合 | P1 期间导出暂走旧路径，WP3.4 统一切换 |
| 插件规范过度设计 | v0 只定三类贡献点（类型模板/技能/渲染器），其余留扩展位 |
