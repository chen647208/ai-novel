# deepseek-harness 调研："一切皆插件"的先锋实验与社区补票现场

> 调研日期：2026-08-31 ｜ 仓库：https://github.com/deepseek-ai/deepseek-harness ｜ 205k★ ｜ TypeScript + pnpm monorepo ｜ developer preview，迭代极快（14k+ commits）｜ **MIT 许可证**（写作类调研对象中少数可合法参考代码实现的，另一个是 07 codex 的 Apache-2.0）
> 定位：开源 agent harness（`dsh`），"Everything is a Plugin"，由 Cordis 框架驱动。用户指定重点跟踪对象——既学它的架构，也学社区怎么给它补设计债。

## 1. 官方架构拆解（值得学的部分）

### 1.1 Cordis：无特权内核 + 可逆注册

- 插件向共享上下文贡献**服务、类型化事件、可逆效果（reversible effects）**。
- 模型适配器、工具注册表、会话日志、甚至 **agent loop 本身都是插件**——"没有需要打补丁的特权内核，想扩展就在旁边挂一个插件"。
- **注册是效果，插件卸载时自动回滚**（unwind）。这条不变量是整个架构最漂亮的地方：动态装卸不残留脏状态。

### 1.2 Profiles / Bundles / Patches：组合式发行（对"大而全"的直接答案）

- **Bundle** = 一组配置行 + 代码的分发单元；**Profile** = 命名组合（列出堆叠哪些 bundle + 自带 patch）。`web / headless / sdk / sdk-minimal / acp` 都是 profile 模板，共享 `dsh-base` 第一层（模型适配、工具、持久化、沙箱审批、设置、凭据、遥测）。
- **Patch 是声明式的**：`cordis.patch.yml` 按 id 定位配置行，整行替换或插入。层级顺序：bundle 列表 → profile patch → home 级 patch → `--patch` 覆盖。
- `dsh --profile web --dump-config` 打印最终组合树，**任何一行都可被上层 patch 替换**——"可组合、可观察、可覆盖"三件套。
- 有实时 patch 重载（web），一次性任务（headless/sdk）则启动时定格——**按生命周期语义决定是否热更**，考虑得很细。

**映射**：这就是我们"什么功能都敢塞"的发行模型——功能做成 bundle，用户按 profile 组合（"网文全家桶"、"出版工作流"、"极简写作"），个性化用 patch 覆盖。核心永远不 fork。

### 1.3 事件即扩展点（三层事件域）

- **Session events**：追加进持久日志的"事实"（reload 后仍在）。
- **Agent events**（`agent/*`）：携带活体 Agent 的观测/拦截点（inbox、step、status、validation、continuation）。
- **Capability events**：往"接缝"（`fs/*`、`tools/*`、`telemetry/*`）挂策略和适配器，**不 import agent loop**。
- 官方维护全量 event producer/consumer 地图（event-producer-consumer.md）。

**映射**：我们插件 API 的事件层应照此三分：**持久事实 / 活体流程拦截 / 能力接缝装饰**。尤其"capability seam"概念——文件系统、工具执行、遥测各留一条装饰缝，插件加策略不加侵入。

### 1.4 其他工程细节

- 会话 = append-only `SessionEvent` 日志（与 codex rollout 同思路，事件溯源）。
- 系统提示词由 `core/system-prompt` 按"section + tool-schema 装配"做成独立插件——**prompt 组装本身可插拔**。
- 仓库有 `postmortem/` 目录（事故复盘入库）、`.agents/notes/`（决策笔记带日期归档）、翻译配对 merge driver（中英双语文档强制同步）——**文档 i18n 和复盘制度化**都值得抄。
- 官方 README 直说"建议用 agent 探索代码库理解架构"——harness 项目吃自家狗粮。

## 2. 社区补票现场（设计债清单，逐条对照）

用户判断准确：缺插件规范、缺交互协议。以下是**已核实的社区反馈**（GitHub Discussions，2026-08）：

| 问题 | 证据 | 教训 |
|---|---|---|
| **无故障隔离** | 热帖《Plugin loading lacks fault isolation》：一个插件激活时抛 `ReferenceError: inject is not defined`，**整棵插件树全挂**，且没有单插件禁用开关，只能删文件恢复（2026-08-25 实例） | 插件加载必须逐个 try-catch + 状态上报（loaded/failed/skipped）+ 配置级禁用开关。**day-1 就要有，不是 v2 补** |
| **破坏性变更频繁** | 《新版本动了什么呀? 一更新整个环境坏掉了, 上周用还好好的》 | 官方靠 README 警告"会有破坏性变更"是不够的；要 Twine 式宿主版本区间（04 篇）+ 社区自发做了《Plugin compatibility report》 |
| **核心与 UI 耦合** | 《headless/TUI can't use agent presets (persona) — mount() is coupled to the web frontend》 | "一切皆插件"没做到位：persona 注册路径被 web 前端绑架。**接缝要按能力域切，不按 UI 形态切** |
| **无插件 manifest 规范** | 社区自建秩序：`dsh-plugin` GitHub topic 目录（150+ 插件按 star 排名）、社区 Marketplace（一键安装）、《Plugin Category Guidelines》、《Your first plugin guide》、插件命名空间斜杠命令提案（`/plugin:command` 防命令冲突） | 官方不写规范，社区就替你写——然后你被迫追认。**插件规范（manifest、命名空间、分类、兼容性报告）是生态的前置条件**，codex 那份 manifest（07 篇）就是现成模板 |
| **交互协议缺口** | 《userQuestions: single global provider without timeout hangs non-web channels forever》（微信/Telegram 网关上问用户问题永久挂起）、《multi-surface ask-user routing》提案（多通道 fan-out + first-answer-wins） | agent 向"人"提问也需要协议（哪个通道问、超时怎么办、多端谁先答）。我们的 AI 审批流（07 篇沙箱审批）会遇到一模一样的问题：**审批要按"多表面路由"设计** |
| **错误吞噬** | 《REQUEST_EXTENSION 报错把 cause 链完全吞掉：终端、会话日志、Web UI 三处都看不到真实原因》 | 插件系统必须规定错误契约：保留 cause 链、按插件归属上报。呼应 codex `load_outcome` 类型化 |
| **工具 schema 质量** | 多条《run_code/bash 同名 required description 导致工具调用死循环》 | 工具注册表要有 schema 校验/冲突检测（重名、必填项语义），这是 harness 的"编译器"职责 |

## 3. 我们要抄什么 / 避什么（映射到 ai-novel）

**抄**：
1. **Bundle/Profile/Patch 三层组合发行** → 我们功能集的组织方式；`--dump-config` 式的"最终装配树可打印可审计"。
2. **可逆注册（unwind）** → 插件卸载不留脏状态，作为我们插件运行时的硬不变量。
3. **三层事件域**（持久事实/活体拦截/能力接缝）→ 插件 API 事件设计。
4. **prompt 组装插件化** → 我们的 aiContextBuilder 应拆成"section 装配器"注册表。
5. **postmortem/ + agent notes/ 制度** → 我们仓库直接照搬目录结构。
6. **MIT 许可证** → 少数可以合法参考代码实现的项目，写插件运行时前精读 `packages/` 里 Cordis 注册/patch 机制的实现。

**避**（社区已付过学费的坑，day-1 设计进规范）：
1. 逐插件故障隔离 + 状态面板 + 禁用开关。
2. 宿主版本区间声明（借 Twine）+ 兼容性 CI。
3. 插件命名空间（`/plugin:command`、`ctx` 键前缀、事件域前缀）。
4. 错误契约：cause 链保留、按插件归属聚合。
5. 人机交互协议：审批/提问的多表面路由 + 超时策略。
6. 能力接缝按域切不按 UI 切，headless 与 GUI 共享全部注册路径。

## 4. 跟踪计划（持续观察项）

- 官方是否会吸收社区规范（manifest 标准化、marketplace 收编、fault isolation PR 是否落地）。
- Cordis 论文（arXiv 2608.25512《A Programming Paradigm for Spatiotemporal Composability》）与实现的差距。
- developer preview → 1.0 的 API 冻结策略（会不会引入版本区间机制）。
- 每两周扫一次 `dsh-plugin` topic 与 Discussions 的"Proposal"标签。

## 5. 参考

- 架构：docs/architecture.md（+ zh 版）
- Cordis 入门：docs/cordis-primer.md、docs/cordis-tutorial/
- 能力接缝：docs/capability-seams.md
- 事件地图：docs/event-producer-consumer.md
- 工具执行管线：docs/tool-execution-pipeline.md
- 社区：Discussions（fault isolation / compatibility report / marketplace / category guidelines 诸帖）
