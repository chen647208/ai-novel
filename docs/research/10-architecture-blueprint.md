# ai-novel 架构蓝图：插件化的通用小说创作工具（总纲）

> 2026-08-31 ｜ 本篇是 01–09 调研的归纳合成，所有结论可回溯到对应调研篇的证据。
> 产品定位一句话：**一个"既要 AI 又要常规写作"的、各类型数据通用的小说创作工作台——功能广度靠插件生态供给，深度靠统一内核保证。**

## 0. 五条设计公理（从九个项目的成败中提炼）

1. **纯文本为源，索引为缓存**（novelWriter 的存储 × Trilium 的索引器）——用户的数据永远可读、可 Git、可被任何外部工具处理；数据库只是加速层，随时可重建。
2. **实体极少，语义靠约定**（Trilium 六实体 × Manuskript 模板）——新数据类型 = 新类型模板，不是新表新代码。这是"什么数据都敢塞"的唯一可持续形态。
3. **一切变更走单一管线**（ProseMirror transaction × Trilium entity_changes × codex rollout）——人、AI、撤销、同步共用一条变更通道，审计/diff/回滚/审批全部免费。
4. **扩展永远非必需**（Twine 规范条款）——禁用任何插件（包括全部 AI）后，纯写作功能完整可用。AI 是增强层不是地基。
5. **规范先于生态**（harness 教训）——manifest、命名空间、错误契约、故障隔离在第一个插件存在之前就写好，否则社区替你写。

## 1. 分层架构

```
┌─ 表面层 ─────────────────────────────────────────────┐
│ 桌面(Electron) │ Web │ VS Code 插件形态 │ CLI(未来)      │
├─ UI 运行时 ──────────────────────────────────────────┤
│ 槽位系统(launcher/面板/工具栏/右键) ← 插件贡献 UI        │
│ 双编辑器内核: TipTap(正文) + CodeMirror6(大纲/DSL)      │
├─ 协议层 ─────────────────────────────────────────────┤
│ 内部服务 API(REST/WS, IPC 只是本地薄壳)                 │
│ MCP server 出口(书/章节/卡片/索引 → 任何 agent 可读写)   │
├─ 功能层(全部插件化) ──────────────────────────────────┤
│ 内置 bundle: 章节/人物/世界观/时间线/伏笔/大纲/一致性…    │
│ AI bundle: 工具注册表 + 写法技能(SKILL.md) + 审批流      │
│ 社区 bundle: 流派模板/导出格式/分析视图…                 │
├─ 内核 ───────────────────────────────────────────────┤
│ 数据: Node/Edge/Attribute/Revision/Blob + 类型注册表    │
│ 索引: 引用扫描器(硬链接/软引用) + entity_changes         │
│ 插件运行时: manifest/生命周期/沙箱/故障隔离/命名空间      │
│ 导出: Build Profile 三段式(选择→变换→渲染)              │
└──────────────────────────────────────────────────────┘
```

## 2. 核心决策与出处

### 2.1 数据层（详见 01/03/05 篇）

- **六实体基元**：`Node`(内容) / `Edge`(多父克隆 + 关系) / `Attribute`(label+relation，可继承可提升) / `Revision`(自动版本) / `Attachment` / `Blob`。
- **类型注册表**：`类型 = 字段模板(Manuskript) + 标签类别(novelWriter Root 类型) + 视图配置 + 图标`。characters/world/timeline/knowledge/cards 全部坍缩为"Node + 类型"。插件可注册新类型（如"魔法体系"），自动获得引用/索引/Build 过滤能力。
- **Edge 二分**：硬链接（章节跳转，一致性检查管辖、改名联动）vs 软引用（`@tag: Jane`，改名不重写正文但引用面板可见）——Twine Links/References 模型。
- **章节工业字段**：POV / Status / Labels[] / Synopsis / WordGoal / IncludeInCompile（Manuskript 沉淀清单）。
- **叙事线（Strand）升为一等实体**：场景↔叙事线多对多，伏笔挂线上（bibisco 概念，取其设计弃其代码）。
- **entity_changes 表 + instanceId + agentId**：现在就埋，未来同步/AI 审计/协作同一块地基；AI 写入天然可查。

### 2.2 存储与同步（详见 03/05 篇）

- 书 = 目录（Git 友好纯文本 + frontmatter），SQLite 只做索引缓存，可全量重建。
- 冲突策略：**禁止裸 LWW**；同步冲突生成冲突副本 + 可视化对比；AI 改写永远先存 Revision。
- 逐条目加密（未发表手稿）+ 会话级解锁（Trilium protected session 模式）。

### 2.3 编辑器（详见 06/09 篇）

- 双内核：TipTap（正文，自定义节点承载写作原语）+ CM6（大纲/DSL/@tag 高亮校验）。
- **写作原语做成编辑器扩展**：Enter×3 结构流、占位符+红点、Darlings（带位置锚点的弃稿）、幽灵大纲（灰色可覆盖段落）、排印自动修正、按需拼写检查。
- AI 改写走 transaction 管线 → diff 预览 → 审批落盘。
- UI 宪法（Twine DESIGN_GOALS）：给默认值不开弹窗、无模式、全可撤销、新手 10 分钟上手。

### 2.4 AI 层（详见 07 篇）

- **五层对齐 codex**：工具注册表（ToolSpec，内置与 MCP 同管线）/ 写法技能（SKILL.md + 渐进式加载控 prompt 预算）/ 装配式插件 / 沙箱×审批双维度（目录白名单 + 建议/改写/重写三档）/ 会话事件流（rollout 式可回放）。
- **写法引擎 = 技能目录**："黄金三章""雪片法""POV 转换"是数据不是代码，用户可自建——核心差异化。
- prompt 组装插件化（harness system-prompt 包模式）：aiContextBuilder 拆为 section 装配器注册表。
- 多表面审批路由（harness ask-user 教训）：桌面弹窗/Web/未来 IM 通道 fan-out，first-answer-wins + 超时降级为"仅留痕不阻塞"。

### 2.5 插件层（详见 04/08/09 篇）

- manifest v0 = codex 骨架 + Twine 版本区间 + 我们的 `types/ui` 贡献点（09 篇有完整 JSONC 样例）。
- 贡献点清单：类型模板 / 编辑器扩展 / UI 槽位 / 命令 / 技能 / MCP server / hooks（能力接缝）/ Build 变换器 / 导出渲染器。
- Day-1 硬约束：逐插件故障隔离+状态面板+禁用开关；命名空间强制；错误契约（cause 链保留）；可逆注册（unwind）；权限声明制。
- 分发 = bundle/profile/patch（harness 组合模型）：官方预设"网文全家桶/出版工作流/极简写作"profile，用户 patch 微调，`--dump-config` 式装配树可审计。
- 资源型插件零编译（模板/技能/主题），逻辑型走 worker/iframe 沙箱 + MCP，WASM 二期再议。

### 2.6 导出与开放格式（详见 01/06 篇）

- Build Profile 三段式：选择器（root/文档/内容过滤）→ 变换器（标题注入/剔除规则，插件可贡献）→ 渲染器（EPUB/PDF/网页/有声稿，插件可贡献）。
- **ai-novel DSL**（小说版 Fountain）：正文 + @tag + frontmatter 的开放文本格式，作为库格式与互操作通道；同时验证核心库平台无关性（VS Code 形态支线）。

## 3. 迁移路线（对现有 15 个 feature）

| 阶段 | 内容 | 涉及现状 |
|---|---|---|
| P0 地基 | 六实体+类型注册表+索引器+entity_changes；服务层 API 化；插件规范 RFC 内部评审 | shared/types.ts 1 万行收敛；主进程按 Zettlr Provider 骨架立规矩（02 篇） |
| P1 内核 | TipTap/CM6 双内核接入；写作原语扩展；Revision+审批流 | writing/chapters/outline 重构 |
| P2 AI 工具化 | 现有 prompt service 全部改 ToolSpec；技能目录上线；MCP server 出口 | assistant/consistency 的 AI 部分 |
| P3 插件化 | 运行时（隔离/命名空间/生命周期）；内置 feature 逐个"插件化"（吃自己的狗粮）；profile/bundle 发行 | cards/world/timeline/foreshadowing… |
| P4 生态 | 类型模板/技能/导出渲染器三类贡献点对外开放；示例插件仓库；文档站 | 新代码 |

原则：**每个阶段结束时产品可完整发布**（公理 4 的推论），不做"重构期不可用"。

> 各阶段的工作包分解、现状诊断、依赖排序与风险登记：正式方案见 **[design/08 路线图](../design/08-roadmap.md)**（M0–M5，基于 2026-08-31 代码实测重排）；[11 迁移计划](11-migration-plan.md) 保留作早期粗排输入。

## 4. 红线清单（各项目用失败换来的）

1. 不复制 copyleft 项目代码（novelWriter/Zettlr/Twine/Manuskript/bibisco 为 GPL-3.0，Trilium 为 AGPL-3.0；宽松许可的只有：harness MIT、codex Apache-2.0、warewoolf/NEO/BetterFountain 及 TipTap/CM6 等编辑器内核 MIT）。
2. 不做 .msk 式黑盒单文件存储（Manuskript 教训）。
3. 核心功能不阉割进付费版（bibisco 教训）——商业价值放插件/云同步层。
4. 不 fork 编辑器内核魔改（Trilium CKEditor 教训）——只用标准扩展机制。
5. 不在有插件生态前发布无隔离的运行时（harness 教训）。
6. AI 不做静默覆盖写（LWW 教训）——永远 Revision + 审批。
7. 单人手写"大而全"= bibisco 死路——功能广度必须外包给生态。

## 5. 持续跟踪

- **deepseek-harness**：fault isolation/manifest 标准化是否落地、Cordis 论文精读、`dsh-plugin` topic 生态、两周一次扫 Discussions（详见 08 篇跟踪计划）。
- **codex**：skills/plugin crate 演进、app-server 协议细节。
- **Zed**：WASM 扩展接口（WIT）成熟度，评估二期引入。
- **TriliumNext**：React/Preact 迁移进展（与我们技术栈趋同，可长期对标）。
- 各调研项目 release notes 季度回看。

## 6. 调研索引

见 [docs/research/README.md](README.md)。
