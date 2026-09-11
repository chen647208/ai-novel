# 20 外部项目基准（Trending 对标）

本文件对 GitHub Trending 当日榜单逐项剖析，并与红月创作的子系统对照，给出两类判定：

1. **完整上位替代（子系统级）**：该项目的对应子系统已落地且比本项目目标设计更完整，可整体作为对标蓝本。
2. **局部更优**：只借用其中某个机制，不构成子系统级替代。

抓取时点：2026-09-11（榜单为当日 GitHub Trending daily；星标与许可证为当日快照，随时间变化）。
许可证：copyleft 项目只作设计参考，不复制代码。来源地址见各节与文末汇总。

## 一、分类总表

| 项目 | 定位 | 许可证 | 星标快照 | 判定 | 对应本项目子域 |
|---|---|---|---|---|---|
| vastsa/PI-Desktop | 本地优先 AI 编码 agent 桌面工作台 | LGPL-3.0 | 2.6k | **完整上位替代** | AI 层、插件系统 |
| Sonarr/Sonarr | 自托管电视 PVR | GPL-3.0 | 15.6k | **完整上位替代（参考）** | 扩展点、后台任务、健康检查 |
| github/spec-kit | 规格驱动开发工具链 | MIT | 135.6k | 局部更优 | 模板优先级、发行档、创作流程 |
| obra/superpowers | agent 技能框架与开发方法论 | MIT | 285.1k | 局部更优 | 技能分层、两段评审 |
| alsk1992/CloddsBot | 自托管 AI 交易终端 | MIT | 1.3k | 局部更优 | 技能加载、会话记忆、工具契约 |
| nashsu/llm_wiki | 文档增量编译为持久 wiki | GPL-3.0 | 18.5k | 局部更优 | 知识库、数据模型、摄入队列 |
| jordan-gibbs/hyperresearch | 深度研究 agent 流水线 | MIT | 2.3k | 局部更优 | 文件为真相、lint 门禁、不可信围栏 |
| alphaXiv/OpenResearch | 本地优先研究 agent 工作台 | MIT | 1.1k | 局部更优 | 多 provider 适配、实验分支 |
| pascalorg/editor | 开源 3D 建筑设计器 | MIT | 23.4k | 局部更优 | 插件注册表、增量系统、MCP 同源 |
| ayghri/i-have-adhd | agent 输出风格技能 | MIT | 40.3k | 局部更优 | AI 输出规则、跨运行时分发 |
| bilawalsidhu/gods-eye-view | 浏览器内卫星态势模拟器 | MIT（GitHub 标 NOASSERTION，未核实） | 26.1k | 局部更优 | 渐进增强、密钥管理、成本上限 |
| melgarafael/DeskcommCRM | 自托管 AI 销售系统 | MIT | 1.1k | 局部更优 | 事件队列、幂等、自更新回滚 |
| armory3d/armorpaint | 跨平台 3D 纹理绘制 | zlib/libpng | 4.6k | 弱借鉴 | 单文件项目包、节点图、无头导出 |
| nab138/iloader | iOS 图形化侧载工具 | MIT（品牌另有许可） | 2.4k–2.8k | 弱借鉴 | 更新、i18n、错误提示映射 |
| jihe520/MathModelAgent | 数学建模多 agent 系统 | 自定义（禁商用/禁闭源分发） | 4.8k（数值不一致） | 弱借鉴 | 技能编排、计划落盘 |
| p1neappleXpress/OpenFlux | Go TCP 隧道/网络栈研究工具 | GPL-3.0 | 965 | 不适用 | 仅接口基类形态弱借鉴 |

产品级结论：没有任何项目完整替代红月创作整体；完整上位替代只存在于 AI 层、插件系统、扩展点与运维子系统这一级。

## 二、完整上位替代（子系统级）

### 2.1 PI-Desktop 对 AI 层与插件系统

来源：https://github.com/vastsa/PI-Desktop ；许可证 LGPL-3.0（只借设计，不抄代码）。

- 架构四层：渲染层（React，无 Node）→ Electron 主进程（薄编排：窗口/IPC/进程监督）→ Rust host core（权限、文件、SQLite、密钥，独占写库）→ pi agent sidecar（turn 编排与模型流式）。跨层用 stdio JSON-RPC(NDJSON)。
- 对 AI 层的对位：其 skill catalog 常驻 + 正文按需加载，与本项目 SkillCatalog 同构且限制更明确（每插件 ≤32 skill、单文件 ≤128KiB）；工具执行前过权限门，审批分 read/write 档，与本项目 ApprovalRouter 的 read / write:proposal / write:direct 对位。
- 对插件系统的对位：manifest 声明 `contributes` 与 `permissions`，权限默认拒绝，路径访问过四道门（声明∩授权 → realpath 包含 → deny-list → scope）；插件生命周期为状态机，贡献注册失败回滚。本项目插件 v0 只跑资源型，正好是该模型的子集。
- 数据策略：会话正文写 JSONL，SQLite 只作索引，流式用 `.inflight.json` 周期原子替换检查点；对本项目长会话与长文场景可直接对标。
- 不可借鉴：Rust host core 与本项目「Electron 全 Node、无 Rust 人力」冲突；LGPL-3.0 禁止代码级复用；其文件/diff/Bash 工具面向编码，不迁移。
- 未验证：其文档自述插件进程尚未做到 OS 级沙箱，`fs.*` 权限只挡 API、不挡进程内建；插件仅 sha256 校验、无签名。

### 2.2 Sonarr 对扩展点与后台任务子系统

来源：https://github.com/Sonarr/Sonarr ；许可证 GPL-3.0（只借设计，不抄代码）。

- 扩展点抽象 `ThingiProvider`：Indexer、Download、Notification、ImportList、MetadataSource 等统一「接口 + 设置 UI + 生命周期」挂载，是插件宿主扩展点的成熟形态。
- 后台任务调度器与 Housekeeping：周期任务（同步、刷新、清理）集中调度；健康检查、备份、认证、历史为标配子系统。
- 存储：SQLite 与 PostgreSQL 双支持，迁移走 FluentMigrator；与本项目 SQLite 为地基可作迁移自检参考。
- 可作子系统级参考：若本项目补齐逻辑型插件宿主、调度器与健康检查，Sonarr 是成熟度更高的对标蓝本。
- 不可借鉴：GPL-3.0 禁止代码复用；PVR 领域模型与 .NET/AspNetCore/SignalR 栈不迁移；Web 服务 + 浏览器 UI 的部署模型与桌面本地应用不同。

## 三、逐项目剖析

### 1. ayghri/i-have-adhd

- 来源：https://github.com/ayghri/i-have-adhd ｜ MIT ｜ 40.3k
- 定位：单一 `SKILL.md` 定义的输出风格技能，让 agent 先给下一步、编号步骤、压制枝节、每轮重述状态。
- 架构：唯一事实源 `skills/i-have-adhd/SKILL.md`；对 Claude/Codex/Cursor/OpenCode/Gemini/Qwen/Kimi 各留薄 manifest 与 hook；`evals/cases.jsonl` + `rubric.md` + 独立 judge 脚本评测输出是否守规则。
- 关键机制：单源 + 薄适配；按需触发与 always-on（flag 文件）两种激活；跨平台 hook 输出字段区分宿主；破例条款声明「宿主系统提示优先」。
- 对红月：局部更优。技能跨运行时分发形态、`disable-model-invocation`（仅用户触发）、输出规则本身可做成内置技能模板、评测 rubric 可支撑技能质量门。
- 不可借鉴：不含任何应用功能；10 条规则针对编码 agent 的回答结构，创作场景需改写。

### 2. bilawalsidhu/gods-eye-view

- 来源：https://github.com/bilawalsidhu/gods-eye-view ｜ README 标 MIT，GitHub 归类 NOASSERTION（未核实）｜ 26.1k
- 定位：浏览器内卫星态势模拟器，数据来自公开源，含 Cesium 3D 地球与 OpenAI Realtime 语音代理。
- 架构：无框架 Vanilla JS + CesiumJS + Vite；每图层一模块，共享 `contextStore`；私钥调用走服务端代理；磁盘缓存与渲染 governor。
- 关键机制：本地优先 + 渐进增强（无 key 也可用）；应用内密钥设置（写入前设 owner-only）；28 个语音工具且明令不得幻觉动作；成本硬上限与可见支出；份额链接序列化视图状态；数据标注区分实时与估计。
- 对红月：局部更优。渐进增强、应用内 key 管理 UX、工具契约反幻觉、成本上限、视图状态序列化可迁移。
- 不可借鉴：Cesium/WebGL 与地理管线、无框架手写 DOM、无持久化数据库。

### 3. nab138/iloader

- 来源：https://github.com/nab138/iloader ｜ MIT（另附品牌许可）｜ 2.4k–2.8k
- 定位：iPhone 图形化侧载工具（Tauri 2 + React 19 + Rust）。
- 架构：设备通信由外部 crate（`idevice`/`isideload`）承担，应用层只做编排；凭据进系统 keyring；`tauri-plugin-updater` 自动更新；日志按平台落盘、级别可调。
- 关键机制：错误码到用户建议的映射层；按语言分文件的 i18n；keyring 凭据存储；多平台更新分支（Windows 未签名降级）。
- 对红月：弱借鉴。错误提示映射、i18n 组织、keyring、自动更新形态可参考；Tauri 栈已被本项目排除。
- 不可借鉴：iOS 侧载、usbmuxd、证书吊销与创作无关。

### 4. melgarafael/DeskcommCRM

- 来源：https://github.com/melgarafael/DeskcommCRM ｜ MIT ｜ 1.1k
- 定位：自托管的 AI 销售系统（Next.js + Supabase），AI 代理在 WhatsApp 上接待与推进销售。
- 架构：Next 应用 + 9 类 worker + 10 个 cron 端点；Supabase Postgres（RLS + vector）；Redis 限流。
- 关键机制：事件溯源队列（DB trigger 只写 `event_log`、不发 HTTP，worker 由 cron 排空）；幂等键 + 唯一约束 + 23505 捕获；自更新代理（备份→升级→失败自动回滚并显式告知）；`baseline.sql` 单一 schema 源、install/update 双跑证幂等；API 契约（snake_case、ISO-8601、`X-Request-Id`）。
- 对红月：局部更优。生成/索引长任务走事件队列避免阻塞、重复提交幂等、更新回滚并告知、迁移自检、MCP 暴露写作能力。
- 不可借鉴：多租户 RLS、LGPD、WhatsApp 反封、云栈（Supabase/Upstash/Sentry）与本项目本地优先定位冲突。

### 5. vastsa/PI-Desktop

见 2.1。

### 6. armory3d/armorpaint

- 来源：https://github.com/armory3d/armorpaint ｜ zlib/libpng ｜ 4.6k
- 定位：跨平台单机 3D PBR 纹理绘制工具，源码开放、发行二进制付费。
- 架构：自研 C 引擎 `base/`（iron，目标 D3D12/Vulkan/Metal/WebGPU）+ 应用层 `paint/`；`.arm` 项目文件由 armpack 编解码；插件用极简 C 方言 `minic` 编写；本地神经节点基于 `iris`。
- 关键机制：单文件项目格式可选打包外部资源；材质/画笔为节点图并逐笔求值；插件管理闭环与 `--api` 打印脚本接口；本地模型按显存分级、离线可用；无头 CLI 导出。
- 对红月：弱借鉴。单文件作品包（正文+设定+素材）、节点图式非线性编辑、插件管理 UX、本地模型分级、无头导出、可配置撤销栈。
- 不可借鉴：原生 C 插件无沙箱、可执行任意代码，违反本项目「权限默认拒绝」；`iris` 与内置模型的许可证未核实，不引入。

### 7. alsk1992/CloddsBot

- 来源：https://github.com/alsk1992/CloddsBot ｜ MIT ｜ 1.3k
- 定位：自托管 AI 交易终端，自然语言驱动多市场交易。
- 架构：Gateway（Express HTTP/WS）→ 四 Agent → 统一风控层 → 执行适配层 → 持久层；21 个渠道适配器继承 `BaseAdapter`；SQLite + LanceDB + PostgreSQL 分工。
- 关键机制：Skills 双轨加载（Markdown 提示技能 + 惰性 `import()` handler，含依赖门禁、SHA-256 快照缓存、热重载、命令直发）；会话历史 append-only 与上下文压缩分离（只留最近若干条 + 摘要）；工具契约为 `{name,description,parameters(JSON Schema),execute}`；`RiskEngine.validateTrade()` 单一事前门禁；决策落账含 reasoning/confidence 与完整性哈希。
- 对红月：局部更优。技能双轨加载是「插件 v0 只跑资源型」向逻辑型扩展的直接参考；会话窗口与全量历史的解耦；工具 JSON Schema 契约；写前单点校验；建议溯源与置信度。
- 不可借鉴：交易/DeFi/链上逻辑无关；PostgreSQL 分析与本地优先定位冲突；加密私钥处理不套用；其安全承诺为自述、未独立验证。

### 8. nashsu/llm_wiki

- 来源：https://github.com/nashsu/llm_wiki ｜ GPL-3.0 ｜ 18.5k
- 定位：把文档增量编译成持续维护的 Markdown 个人 wiki（非每次查询从零检索）。
- 架构：Tauri v2（Rust）+ React 19/TS + Milkdown 编辑器；内嵌本地 HTTP API（`127.0.0.1:19828`，token 保护）与本地 MCP server；数据为纯 Markdown 文件树 + 可选 LanceDB。
- 关键机制：三层 `raw/`（不可变源）→ `wiki/`（LLM 生成）→ `schema.md`（规则）+ `purpose.md`（意图）；两步 CoT 摄入（先分析后生成）；SHA256 增量缓存跳过未变文件；持久化摄入队列（串行、崩溃恢复、重试 ≤3）；`sources: []` 溯源与级联删除（共享实体只去引用）；4 信号相关度 + Louvain 社区 + 图谱洞察；能力白名单权限（Process 惰性、批准列表不得由模型输出填充）；token 预算 60/20/5/15。
- 对红月：局部更优。知识库的增量摄入、溯源、级联清理与能力白名单权限，可对齐本项目知识库与一致性检查；`purpose.md`/`schema.md` 分离可对齐「设定规则 vs 主题意图」。
- 不可借鉴：Tauri 栈；单文件巨型 Rust agent 与「薄核心」相悖；GPL-3.0 禁止代码复用。

### 9. obra/superpowers

- 来源：https://github.com/obra/superpowers ｜ MIT ｜ 285.1k
- 定位：可组合 `SKILL.md` 技能库 + 开发方法论，约束 agent 走「头脑风暴→计划→子代理开发→评审→收尾」。
- 架构：无长期进程；`skills/<name>/SKILL.md` + 多 harness manifest + SessionStart hook；`evals/` 外部评测。
- 关键机制：frontmatter 只含 `name`/`description`（description 写触发条件），正文按需加载；会话启动把引导技能全文注入并在压缩后重注入；子代理两段评审（先规格合规、再质量）；计划粒度为 2–5 分钟且含确切文件路径与验证步骤；单一技能源 + 每宿主薄 manifest。
- 对红月：局部更优。技能触发描述标准、压缩后重注入、两段评审（先 beat 合规后文笔）可直接对标写作流程与一致性检查；跨 harness 适配清单可借。
- 不可借鉴：绑定宿主私有 hook（Claude Code SessionStart、OpenCode experimental hook）；TDD 强制流程针对代码。

### 10. Sonarr/Sonarr

见 2.2。

### 11. jihe520/MathModelAgent

- 来源：https://github.com/jihe520/MathModelAgent ｜ 自定义许可（禁商用、禁闭源分发，非 OSI）｜ 4.8k（数值不一致）
- 定位：数学建模多 agent 系统，从赛题分析到论文产出。
- 架构：Vue 3 前端 + FastAPI 后端 + Redis（任务队列与广播）；LiteLLM 统一接入，每个 Agent 可配不同模型；技能层为 `SKILL.md` 工作流序列。
- 关键机制：总控技能生成 `plan.md`/`todo.md` 并落盘、按序调下游技能，中间产物文件化；阶段产出契约（图表、论文数值只能取自真实结果，禁编造）；Prompt 模板外置（`md_template.toml`）；可复现执行（Jupyter/E2B）；验收技能检查可复现性与提交就绪；PostToolUse lint hook。
- 对红月：弱借鉴。创作工作流入口（选题→大纲→章节→修订→校验）与计划/待办落盘、阶段产出契约、Prompt 外置、质量 hook 可参考。
- 不可借鉴：Python/FastAPI/Redis 后端与本地优先定位冲突；许可比 copyleft 更严，代码一律不碰。

### 12. p1neappleXpress/OpenFlux

- 来源：https://github.com/p1neappleXpress/OpenFlux ｜ GPL-3.0 ｜ 965
- 定位：Go 写的 TCP 隧道/网络栈研究工具，可插拔传输层。
- 架构：`Client(SOCKS5) → Transport → Exit Node → Internet`；`transport/` 定义接口与实现，main 内注册。
- 关键机制：「接口 + BaseTransport（含原子统计与退避重连）+ 注册表」的可插拔后端；多目标构建脚本。
- 对红月：不适用，仅「接口 + 基类 + 注册表」工程形态可弱借鉴到存储/传输后端抽象。
- 不可借鉴：网络隧道、伪装载体、raw socket 与创作无关；GPL-3.0 禁止代码复用。

### 13. jordan-gibbs/hyperresearch

- 来源：https://github.com/jordan-gibbs/hyperresearch ｜ MIT ｜ 2.3k
- 定位：把编码 agent 变成深度研究流水线，产出经对抗审计、带来源溯源的报告并沉淀 vault。
- 架构：Python 包（CLI + core + search + graph + MCP server + web）；「Markdown 为真相，SQLite 为缓存」（可重建）；FTS5；约束用 CHECK 固化词表。
- 关键机制：patch-never-regenerate（合成后只允许 `[Read, Edit]` 逐段改，物理上不能 Write 新稿）；ship gate 结构强制（引文必须逐字存在于 vault、撤稿声明、数值一致、引用逐绑定审计）；不可信输入围栏 `<untrusted-source>`；笔记生命周期状态机（draft→review→evergreen / stale→deprecated→archive）；配置驱动的 profile/levers。
- 对红月：局部更优。「Markdown 真相 + 可重建索引」、lint 硬门禁、笔记生命周期、不可信来源围栏（外部资料进 prompt 的注入防御）可对齐本项目数据层与一致性检查。
- 不可借鉴：绑定 Claude Code/Anthropic；科研 16 步重流程；Python 无 UI；`hooks.py` 巨型文件与薄核心相悖。

### 14. alphaXiv/OpenResearch

- 来源：https://github.com/alphaXiv/OpenResearch ｜ MIT ｜ 1.1k
- 定位：本地优先研究 agent 工作台，接 Claude Code/Codex/OpenCode 做并行研究。
- 架构：Rust CLI（`orx`）+ 内嵌 dashboard（`127.0.0.1:4791`）+ 本地 SQLite；算力后端可切 SSH/Slurm/K8s/Ray 等。
- 关键机制：`Harness` trait 多 agent 适配（加一个文件 + registry 一行）；每 harness 自报权限词汇并做往返校验；SKILL.md shim 只指向权威手册、按需加载；实验树用 git worktree 隔离、节点冻结后不可改；`orx agent spawn` 委派子会话。
- 对红月：局部更优。多 provider/harness 注册表 + 权限词汇校验可对标 gateway 与 ApprovalRouter；shim/权威手册分离即 SKILL 渐进加载；worktree 实验树可对标多草稿分支。
- 不可借鉴：Slurm/K8s/Ray/Modal 等算力编排；Rust CLI 栈；autoresearch 闭环。

### 15. github/spec-kit

- 来源：https://github.com/github/spec-kit ｜ MIT ｜ 135.6k
- 定位：GitHub 官方规格驱动开发工具链，slash 命令流水线 `constitution→specify→plan→tasks→implement→converge`。
- 架构：Python CLI `specify`；每项目 scaffold `.specify/`（`memory/constitution.md`、`templates/`、`scripts/{bash,powershell,python}`、`extensions/`、`presets/`）+ `specs/<NNN-feature>/`；无服务与数据库。
- 关键机制：模板优先级栈（overrides > presets > extensions > core）与 `replace/prepend/append/wrap` 组合；constitution 门（plan 阶段强制 Constitution Check）；extension 用 `extension.yml` 声明 `provides.commands/requires/hooks`，hooks 注册 `before_/after_<command>`；catalog 信任模型（install_allowed vs discovery-only）；feature 自动编号与 `feature.json` 当前指针；`/converge` 反查缺口追加任务。
- 对红月：局部更优。模板覆盖层可直接用于文风/模板包；`constitution.md` 把一致性规则声明化、版本化；hook 注册语义与本项目 manifest v0 的 `hooks` 高度相近；feature 指针/编号可映射卷章目录与当前选中态。
- 不可借鉴：面向代码的 SDD（constitution 门、TDD 式 tasks）不能当创作流；Python CLI 与 Electron/TS 栈不一致。

### 16. pascalorg/editor

- 来源：https://github.com/pascalorg/editor ｜ MIT ｜ 23.4k
- 定位：本地优先 3D 建筑设计器（React Three Fiber/WebGPU），带 CLI、MCP 与插件。
- 架构：Turborepo monorepo（core/viewer/editor/nodes/ui/cli/mcp）；每包一个 Zustand store，`useScene` 持 `dirtyNodes` 并经 Zundo 撤销、Persist 到 IndexedDB；本地 SQLite + WAL，`scene_events` 经 SSE 回流到编辑器。
- 关键机制：`loadPlugin` 校验 `apiVersion === HOST_API_VERSION`，注册节点种类与面板，生产环境重复 kind 抛错，异步 `discoverPlugins`/`extendPluginDiscovery`；能力标志 + 按已装插件过滤可见 kind；dirty-node + systems 只重算脏节点；节点存扁平 `Record<id,Node>`；内置与三方插件使用同一 `Plugin` manifest、无内部私 API；MCP 工具即场景 mutation（`apply_patch` 先 dry-run，版本冲突返回 `live_sync_version_conflict`）。
- 对红月：局部更优。插件 apiVersion 门禁、重复 kind 抛错、能力标志、安装门禁、无内部私 API 可直接对标插件 manifest；dirty-node 增量模型可对标六实体关系增量重算；MCP 与 UI 共用同一 mutation 源可对标 ToolRegistry 与事件流。
- 不可借鉴：3D/WebGPU/R3F 与 Next.js Web 栈；其插件为纯逻辑 TS，无资源型/SKILL 形态。

## 四、横向共性（跨项目收敛的机制）

1. 文本/文件为真相，索引可重建；数据可导出、对 git 友好（llm_wiki、hyperresearch、PI-Desktop）。
2. AI 写入默认 patch-only + 工具白名单，禁止整稿重写（hyperresearch、PI-Desktop）。
3. 持久化、可恢复、可重试的作业队列（llm_wiki、DeskcommCRM、CloddsBot）。
4. provenance + 对抗式核验门，引用逐字校验（hyperresearch、llm_wiki）。
5. 本地 loopback API + MCP + 技能三件套，外部 agent 复用同一内核（llm_wiki、PI-Desktop、pascal、OpenResearch）。
6. 技能单一内容源 + 每宿主薄清单，正文渐进加载（superpowers、i-have-adhd、OpenResearch、CloddsBot）。

## 五、许可证红线

| 可参考实现（宽松） | 只借设计、不抄代码（copyleft 或受限） |
|---|---|
| MIT：spec-kit、superpowers、CloddsBot、hyperresearch、OpenResearch、pascal、i-have-adhd、DeskcommCRM、iloader | LGPL-3.0：PI-Desktop；GPL-3.0：llm_wiki、Sonarr、OpenFlux；自定义禁商用：MathModelAgent |
| zlib/libpng：armorpaint（其 `iris` 与内置模型许可证未核实） | gods-eye-view：README 标 MIT，GitHub 标 NOASSERTION，未核实 |

## 六、待验证与维护

- 各项目星标/分支为 2026-09-11 搜索与 API 快照，部分条目存在不同时点数值不一致，未逐仓库锁定时点核对。
- 各项目「能力宣称」来自其 README/docs，除已标注的源码/文档出处外未经独立复现。
- PI-Desktop 的插件沙箱缺口、armorpaint 的 `iris`/模型许可、gods-eye-view 的 LICENSE 内容为已知待核实项。
- 本文件为时点快照；后续复盘时按需重抓，不追写变迁。

## 附：来源地址汇总

- https://github.com/vastsa/PI-Desktop
- https://github.com/Sonarr/Sonarr
- https://github.com/github/spec-kit
- https://github.com/obra/superpowers
- https://github.com/alsk1992/CloddsBot
- https://github.com/nashsu/llm_wiki
- https://github.com/jordan-gibbs/hyperresearch
- https://github.com/alphaXiv/OpenResearch
- https://github.com/pascalorg/editor
- https://github.com/ayghri/i-have-adhd
- https://github.com/bilawalsidhu/gods-eye-view
- https://github.com/melgarafael/DeskcommCRM
- https://github.com/armory3d/armorpaint
- https://github.com/nab138/iloader
- https://github.com/jihe520/MathModelAgent
- https://github.com/p1neappleXpress/OpenFlux
- 榜单来源：https://github.com/trending （2026-09-11 daily）
