# Manuskript + bibisco 调研：卡片式大纲、模板驱动字段与角色分析

> 调研日期：2026-08-31
> - Manuskript：https://github.com/olivierkes/manuskript ｜ 2.4k★ ｜ Python + PyQt5 ｜ 半活跃（2026-07 有推送）
> - bibisco：https://github.com/andreafeccomandi/bibisco ｜ 767★ ｜ Electron + JS ｜ 停滞（2024-09 最后推送）
> 定位：都是"常规小说写作工具"。Manuskript 学交互与元数据模型，bibisco 学叙事分析概念（代码别碰）。

## 1. Manuskript

### 1.1 通用条目模型：一个 dict + 枚举键

所有数据（大纲项、人物、情节、世界观）共享基类 `abstractItem`，内部就是 `{enum字段: 值}` 字典 + XML 序列化 + 全局唯一 ID。子类模型（outlineModel/characterModel/plotModel/worldModel）只是"字段集合 + 视图"的特化。

**启示**：和我们"每种数据一个 feature 一套表"相比，这是"通用容器 + 类型视图"的中间形态（介于 Trilium 的纯 Attribute 和我们现状之间）。重构时不必一步到位学 Trilium，abstractItem 这种"统一基元 + 枚举字段 + 特化视图"是更平滑的过渡态。

### 1.2 大纲元数据字段集（工业验证过的字段清单，源码实测）

`manuskript/enums.py` 逐字段核实，四类实体的完整字段表：

- **Outline（大纲项）**：`title, ID, type, summarySentence, summaryFull, POV, notes, label, status, compile, text, wordCount, goal, goalPercentage, setGoal, textFormat, revisions, customIcon, charCount`——注意 `setGoal`（用户目标）与 `goal`（子树聚合目标）分离、`revisions` 内建、`compile` 是显式字段。
- **Character（人物）**：`name, ID, importance, motivation, goal, conflict, epiphany, summarySentence/Para/Full, notes, pov, infos`——**motivation/goal/conflict/epiphany 是"人物弧线四件套"**（源自小说方法论），三级摘要（一句话/一段/全文）是分层概要设计。
- **Plot（情节）**：`name, ID, importance, characters, description, result, steps, summary`；PlotStep：`name, ID, meta, summary`——情节=步骤序列，每步挂人物。
- **World（世界观）**：`name, ID, description, passion, conflict`——地点自带"激情/冲突"字段（场景张力追踪）。

这份字段清单是多年用户反馈沉淀的结果，直接对照我们的 characters/world/outline 数据模型查漏补缺。注意 `compile` 字段和 novelWriter 的 Active/Inactive 同源——**"导出选择权"是写作工具的一等字段**。

### 1.3 三视图同一数据：Outliner / Corkboard / 编辑器

- **Outliner**：表格视图（列 = 元数据字段，可排序过滤）。
- **Corkboard**：软木板卡片视图（每场景一张卡，显示 synopsis + 颜色标签）。
- **Distraction-free**：全屏顺序写作。
- 三者是同一个 outlineModel 的不同投影，切换视图不切换数据。

**启示**：我们的 outline/chapters/writing 三个 feature 应该共享一个模型多投影，而不是三份状态。卡片视图（corkboard）是网文作者的刚需交互，值得优先做。

### 1.4 模板驱动的人物/世界观字段（"通用数据"的低成本方案）

人物卡和世界观条目（地点、物品）的字段**不是硬编码的**：用户在 Settings → Templates 里定义字段模板（文本/数字/日期/列表/图片等字段类型），每个条目是模板实例。做奇幻小说的人加"魔法体系"字段，做悬疑的加"不在场证明"字段——**不改代码就扩展数据维度**。

**启示**：这是我们"各类型数据通用"方向的最低成本实现：`类型 = 字段模板 + 图标 + 视图配置`，全部数据驱动。插件化之后，"类型模板"就是插件贡献点之一（novelWriter 的 Root 类型 + Manuskript 的字段模板 = 完整的类型注册系统）。

### 1.5 其他值得记录的机制

- **Bulk Info Editor**：框选多个场景批量改 POV/Status/Labels——网文作者高频操作。
- **Cheat Sheet**：常驻速查面板（人物/地点/术语），写作时随手查自己建的数据。
- **文本内动态引用**：编辑器支持 `{$character}` 类占位符自动补全（completer），导出时替换为实际值——人物改名全文自动更新。这是比 novelWriter 标签更"重"的引用（硬替换），两者对应 Twine 的软/硬引用二分。
- **Snapshots**：场景级文本快照 + diff 对比（比 Trilium Revision 轻，手动触发）。
- **Importers/Exporters/Converters**：多格式进出（md、txt、EPUB、FODT…），管道化设计。

### 1.6 教训

- 项目文件是**单一 .msk 二进制**（SQLite/zip），用户无法用 Git 管理、无法用其他工具编辑——被社区批评多年。反面教材：**存储必须纯文本/可移植优先**（novelWriter 路线正确）。
- PyQt5 桌面栈 + 单人维护 = 演进缓慢。它的功能设计一流，工程架构二流。

## 2. bibisco

### 2.1 值得抄的概念（叙事分析层）

bibisco 是"叙事学理论产品化"最彻底的开源项目，这些概念我们全部没有对应物：

- **Premise（前提）/ Fabula（故事底本）/ Syuzhet（情节编排）** 分离：先有"发生了什么"，再有"怎么讲"。
- **Narrative Strands（叙事线）**：多条情节线并行追踪，每个场景标注属于哪条线、推进了多少——**伏笔/多线叙事的结构化管理**，直接对标我们 foreshadowing feature 的升级方向。
- **三类设定**：地理（geographic）、时间（temporal）、社会（social）context——worldbuilding 的分类骨架。
- **角色中心分析**：每个角色的出场场景曲线、角色间关系图谱（谁和谁在哪些场景互动过）、角色"成长弧线"追踪。它的口号"你的小说只有在角色可信时才成立"。

### 2.2 教训（为什么它停滞了）

- **开源核心 + 付费支持者版**（Community/Supporters Edition）双轨：功能阉割进付费版引发社区反感，贡献者极少（CLA 劝退），单人维护 Electron 全栈，2024 年后实质停摆。
- 对我们的警示：**"大而全"如果靠一个团队手写，就是 bibisco 的下场**。功能广度必须由插件生态供给，核心只做数据模型和扩展机制——这正是我们走插件化路线的根本理由。

## 3. 汇总到 ai-novel 的行动项

0. 字段设计参照：`manuskript/enums.py`（全文仅 90 行，四类实体字段表一目了然，本报告 1.2 节即其转写）。

1. 章节模型补齐工业字段：POV / Status / Labels[] / Synopsis / WordGoal / IncludeInCompile。
2. 大纲三视图（表格/软木板/沉浸）共享单一模型。
3. 人物/世界观改为"模板驱动字段"，模板本身做成可注册类型（未来的插件贡献点）。
4. 新增"叙事线（Strand）"一等实体：场景 ↔ 叙事线多对多，伏笔挂在叙事线上。
5. 角色分析视图：出场曲线 + 关系图谱（数据从引用索引来，见 01/03 篇）。
6. 存储红线：纯文本/可移植优先，禁止 .msk 式黑盒。
7. 商业红线：核心功能不阉割，扩展价值放插件层。
