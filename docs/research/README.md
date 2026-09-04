# 调研文档索引（docs/research）

> 目的：为 ai-novel 的"插件化通用小说创作工具"方向，从 9 个外部项目提取可落地的设计，并合成一份架构蓝图。
> 所有 star 数/活跃度/许可证核实于 **2026-08-31**（GitHub API）。许可证注意：**copyleft（代码不可引入）**——01 novelWriter、02 Zettlr、04 Twine、05 Manuskript/bibisco 为 GPL-3.0，03 Trilium 为 AGPL-3.0；**宽松（可参考实现）**——06 warewoolf/NEO/BetterFountain 与 09 编辑器内核均为 MIT，07 codex 为 Apache-2.0，08 harness 为 MIT。

## 阅读顺序建议

- 想了解整体方向 → 直接读 **10 总纲**，遇到引用再回查单篇。
- 想动手改造 → 读 **11 迁移计划**（工作包分解 + 现状诊断 + 风险登记）。
- 想了解某个项目 → 按下表。
- 每篇结构固定：为什么值得看 → 核心机制拆解 → 我们要抄什么（映射到 ai-novel）→ 不要学的 → 参考。

## 文档列表

| # | 文档 | 对象 | 一句话结论 |
|---|---|---|---|
| 01 | [novelWriter](01-novelwriter.md) | 纯文本小说写作（Python/Qt，3.1k★） | 全文本元数据（@tag/@ref）+ Build Profile 编译式导出，小说数据模型的语义骨架 |
| 02 | [Zettlr](02-zettlr.md) | Electron 学术写作（13.5k★） | 主进程工程化范本：服务容器 + Provider 契约 + 类型化 IPC + 命令对象 |
| 03 | [TriliumNext](03-trilium.md) | 层级知识库（37.6k★） | 六实体通用数据模型 + entity_changes 同步协议，"什么数据都敢塞"的工业答案 |
| 04 | [Twine](04-twine.md) | 互动小说编辑器（2.9k★） | 写作领域最成熟插件规范：宿主版本区间、函数契约、软/硬引用二分、"扩展非必需"原则 |
| 05 | [Manuskript + bibisco](05-manuskript-bibisco.md) | 大纲卡片 / 角色分析 | 模板驱动字段（不改代码扩展数据维度）+ 叙事线/角色分析概念；附两个死法教训 |
| 06 | [warewoolf / NEO / Fountain](06-pure-writing-interaction.md) | 纯写作交互实验 | 写作编辑器原语清单（Enter×3/占位符/Darlings/幽灵大纲）+ 开放文本 DSL 路线 |
| 07 | [openai/codex](07-codex.md) | AI 编码 agent（120k★，Apache-2.0） | AI 层五件套：工具契约/技能渐进加载/装配式 manifest/沙箱×审批/会话事件流 |
| 08 | [deepseek-harness](08-deepseek-harness.md) | 一切皆插件 agent（205k★，MIT） | Bundle/Profile/Patch 组合发行值得抄；社区补的设计债（无隔离/无规范）是我们的 day-1 清单 |
| 09 | [编辑器内核与插件规范](09-editor-kernels-and-plugin-specs.md) | TipTap/CM6/BlockNote/Plate + VS Code/Zed/Figma/MCP | 双内核选型（TipTap+CM6，钩子清单源码实测）、三条编辑器架构不变量、插件规范 v0 合成方案（含 manifest 样例） |
| 10 | [架构蓝图](10-architecture-blueprint.md) | —— 总纲 | 五条设计公理、分层架构、P0–P4 迁移路线、七条红线 |
| 11 | [迁移计划](11-migration-plan.md) | 本仓库现状 | P0–P4 拆成 16 个工作包，逐条落到真实文件路径（含现状诊断与风险登记） |

## 调研对象速览（含未成篇的）

| 项目 | Stars | 状态 | 处置 |
|---|---|---|---|
| Zettlr | 13.5k | 活跃 | 02 篇 |
| TriliumNext/Trilium | 37.6k | 极活跃 | 03 篇 |
| novelWriter | 3.1k | 活跃 | 01 篇 |
| Twine (twinejs) | 2.9k | 活跃 | 04 篇 |
| Manuskript | 2.4k | 半活跃 | 05 篇 |
| bibisco | 767 | 停滞(2024) | 05 篇（只取概念） |
| warewoolf | 338 | 活跃 | 06 篇 |
| NEO | 289 | 活跃 | 06 篇 |
| BetterFountain | 448 | 活跃 | 06 篇 |
| openai/codex | 120k | 极活跃 | 07 篇 |
| deepseek-ai/deepseek-harness | 205k | 极活跃 | 08 篇 |
| TipTap / Plate / Lexical / Milkdown / BlockNote / ProseMirror / CodeMirror | 38.2k/16.5k/23.8k/11.9k/10.1k/8.7k/7.8k | 活跃 | 09 篇 |
| OpenZong | — | **已从 GitHub 消失** | 反面教材（05 篇教训节呼应） |

## 维护约定

- 新增调研：复制任一单篇的模板结构，编号顺延，并更新本索引与 10 总纲的引用。
- 季度回看：更新各项目 star/活跃度/重大变更，重点跟踪 08 篇的"持续跟踪"清单。
- 本目录文档是**设计输入**不是需求文档：落地时拆进 `docs/features/` 对应功能文档。
