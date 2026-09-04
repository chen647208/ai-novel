# openai/codex 调研：AI 层的工业级 harness 架构

> 调研日期：2026-08-31 ｜ 仓库：https://github.com/openai/codex ｜ 120k★ ｜ Rust（codex-rs，60+ crates）+ npm CLI ｜ 极活跃 ｜ **Apache-2.0 许可证**（可参考实现）
> 定位：终端编码 agent。不抄它的"编码"，抄它的 **harness**——AI 能力如何被工程化地封装：工具契约、技能、插件、沙箱、审批、会话、协议。

## 1. 为什么以它为准

用户方向："AI 部分深度参考 codex"。codex 是目前 AI agent 工程化最完整的开源实现：它把"模型能做什么"（tools）、"工作流怎么写"（skills）、"能力怎么分发"（plugins）、"危险怎么兜底"（sandbox/approvals）、"进程怎么解耦"（app-server protocol）五件事分别做成了独立层。我们 AI 写作功能的每一次返工，都能在这五层里找到对应的答案。

## 2. 五层架构拆解

### 2.1 工具层（codex-tools / codex-mcp / rmcp-client）

- 工具模型分层：`ToolSpec`（模型可见声明）→ `ConfiguredToolSpec`（宿主配置后）→ `LoadableToolSpec`（可延迟加载），执行侧统一 `ToolExecutor / ToolCall / ToolOutput` 契约。
- **MCP 是一等公民**：`rmcp-client` 接入外部 MCP server，MCP 工具被"适配转换"成宿主工具形态（schema 消毒、命名空间化）。
- tools README 展示了教科书级的重构纪律：明确写出 **Vision / Non-goals / 迁移步骤 / crate 约定**（"不要把 crate 变成无关 helper 的杂物袋"）。我们拆 `aiContextBuilder` 这类上帝文件时照抄这个文档模板。

**映射**：我们的 AI 功能（生成大纲、续写、一致性检查、伏笔回收）现在都是硬编码 prompt 调用。应全部改造成 ToolSpec 声明 + 注册表，宿主内置工具与 MCP 外部工具走同一管线。

### 2.2 技能层（skills）——写作工作流的完美载体

Codex Skills 规范：
- 技能 = 一个目录，核心是 `SKILL.md`（frontmatter 必须有 name + description），可附带脚本、参考资料、`agents/openai.yaml`。
- **渐进式加载（progressive disclosure）**：宿主启动只注入"名称+短描述"清单（受上下文预算限制），模型决定使用时才读全文。**这是解决"AI 功能越塞越多、prompt 爆炸"的标准答案**。
- 发现机制：仓库级 → 用户级 → 管理员级 → 系统级，逐层扫描；同名不合并。
- 显式提及或语义匹配触发；描述要求"边界清楚、触发词前置"。

**映射**：小说创作的"写法"就是技能——"三幕式大纲法"、"雪片法"、"POV 转换技巧"、"番茄风黄金三章"。做成 SKILL.md 放进项目的 `skills/` 目录，AI 按任务自动选用，**用户可自行添加写法技能而不用改代码**。这可能是我们整个产品最差异化的设计：把"写法引擎"从代码变成数据。

### 2.3 插件层（codex-rs/plugin/manifest.rs）——现成的 manifest 规范

```rust
PluginManifest {
  name, version, description, keywords[],
  paths: { skills[], mcp_servers: path|inline-object, apps, hooks: paths|inline },
  interface: { display_name, short/long_description, developer_name, category,
               capabilities[], website_url, privacy_policy_url, tos_url,
               default_prompt[], brand_color, composer_icon, logo, logo_dark, screenshots[] }
}
```

要点：
- **插件 = 技能 + MCP server + hooks + apps 的分发包**，本体不含可执行逻辑——逻辑全在 MCP（进程隔离）和技能（纯文本）里。这个"manifest 只做装配、执行走协议"的思路，天然规避了插件崩溃/安全问题。
- `interface` 块是为**插件市场 UI** 设计的（分类、品牌色、截图、默认提示词、隐私政策链接）——分发生态的元数据规范直接可抄。
- `load_outcome.rs`：加载结果是一等类型（成功/部分成功/失败原因），插件坏了能精确报告。

**映射**：deepseek-harness 被社区批评"缺插件规范"——答案就在这份 manifest 里。我们插件规范 v0 直接以它为底，加上 Twine 的宿主版本区间（见 04 篇）。

### 2.4 安全层（sandboxing / execpolicy / approvals / process-hardening）

- OS 原生沙箱矩阵：macOS Seatbelt、Linux Landlock+seccomp+bwrap、Windows 专用 sandbox crate——**按平台选最强原生机制，不发明轮子**。
- `execpolicy`：命令执行策略引擎（规则化声明哪些操作允许/需审批/禁止）。
- 审批模式（approval policy）与沙箱（sandbox mode）是**两个正交维度**，组合出 read-only / auto / full-access 等档位。
- 对写作工具的翻译：**AI 对稿件的每次写操作 = 一次"命令执行"**。默认沙箱 = 只能写当前书的目录；审批 = 改动进 diff 预览，用户确认才落盘（配合 Trilium Revision 自动留底）。"AI 味消除"这类批量重写必须走 full-access 档。

### 2.5 会话与协议层（rollout / thread-store / app-server / protocol）

- **rollout**：会话全程录制为可回放文件（事件流），崩溃恢复、调试、审计全靠它。
- **thread-store / message-history**：会话持久化与检索独立成 crate。
- **app-server**：agent 核心与 UI 之间是版本化协议（protocol + transport + client + daemon 四个 crate），TUI、IDE 插件、云端都走同一协议接核心。**与 Trilium"桌面也是 C/S"同构**——AI 核心做成服务，写作 UI、CLI、未来的 Web 端都是瘦客户端。
- agent-roles / agent-graph-store / agent-identity / collaboration-mode-templates：多 agent 分工（不同角色不同工具集/模型）与协作模式模板——"主编 agent + 写手 agent + 校对 agent"的架构参考。
- otel / analytics：可观测性内建，AI 调用链有 trace。

## 3. 我们要抄什么（映射到 ai-novel）

1. **工具注册表 + ToolSpec 契约** → 重构 assistant/，所有 AI 能力工具化，内置与 MCP 同管线。
2. **SKILL.md 写法引擎** → 项目内 `skills/` 目录承载"写法/流派/结构法"，渐进式加载控 prompt 预算。**核心差异化**。
3. **PluginManifest（装配式 manifest）** → 我们插件规范 v0 的蓝本：`paths{skills,mcp,hooks,ui贡献}` + `interface{市场元数据}` + 版本区间（借 Twine）。
4. **沙箱×审批双维度** → AI 写稿权限模型：目录白名单 + diff 审批 + 档位（建议/改写/重写）。
5. **rollout 事件流** → AI 会话与操作审计日志（结合 Trilium entity_changes 的 agentId）。
6. **app-server 协议化** → AI 核心独立进程/服务，渲染层走协议，为多端和第三方宿主（见 06 篇 VS Code 形态）铺路。
7. **Non-goals 文档纪律** → 每个大模块 README 写 Vision/Non-goals/迁移计划。

## 4. 不要学的

- **Rust**：我们栈是 TS，抄架构不抄语言；但"crate 边界 + 明确 non-goals"的模块化纪律必须抄。
- **v8-poc / code-mode**（把 JS 运行时当万能工具）：太激进，写作场景不需要模型写代码执行。
- **OpenAI 私有协议细节**（Responses API 形状）：我们面向多模型供应商，工具层要抽象在自家协议上，向下适配各家。

## 5. 参考

- 工具层：codex-rs/tools/README.md（重构纪律范本）
- 插件 manifest：codex-rs/plugin/src/manifest.rs
- Skills 规范：https://developers.openai.com/codex/skills（308 跳转到 learn.chatgpt.com/docs/build-skills）
- 沙箱：docs/sandbox.md → developers.openai.com/codex/security
- 配置分层：docs/config.md、docs/agents_md.md
