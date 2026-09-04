# 编辑器内核与插件规范参照调研

> 调研日期：2026-08-31 ｜ 全部经 GitHub API 实时核实
> 本篇回答两个问题：**写作区用什么内核**（决定"编辑器扩展"这层插件长什么样）、**插件规范抄谁**（决定 manifest/沙箱/分发怎么设计）。

## 1. 编辑器内核横评

| 内核 | Stars | 活跃度 | 模型 | 插件机制 |
|---|---|---|---|---|
| TipTap | 38.2k | 活跃（08-28） | ProseMirror 之上的无头封装 | 见下方实测钩子清单（`Extendable.ts` 源码核实） |
| Plate | 16.5k | 活跃（08-30） | Slate 之上的"富文本+AI"组件库（udecode/plate，v53） | 插件=配置数组；自带 AI 工具链（生成/流式），shadcn/ui 生态 |
| Lexical | 23.8k | 极活跃（当天） | Meta 自研，节点+命令+transformer | 命令注册表 + 节点序列化；插件模型弱于 PM 系 |
| Milkdown | 11.9k | 活跃（08-30） | ProseMirror + Markdown 原生 | `($ => $.use(plugin))` 函数式插件 + preset 打包 |
| BlockNote | 10.1k | 活跃（08-28） | TipTap 之上的块编辑器（Notion 式） | block = 节点 + props schema + React 渲染器，**每种块一个 React 组件** |
| ProseMirror | 8.7k | 稳定 | schema 驱动的文档模型 | Plugin = `{state, view, props}` 声明；**一切变更走 transaction** |
| CodeMirror 6 | 7.8k | 稳定 | 纯函数式代码编辑器 | **Extension 是值**（可组合数组），StateField/ViewPlugin/Compartment 重配置 |

**TipTap 扩展钩子实测清单**（`packages/core/src/Extendable.ts`）：
- 装配类：`addOptions / addStorage / addExtensions`（**扩展可嵌套贡献子扩展**——插件包一个功能族的机制）`/ addGlobalAttributes`（给既有节点统一挂属性——"所有段落都有场景号"这类需求）
- 行为类：`addCommands / addKeyboardShortcuts / addInputRules / addPasteRules / addDecorations / addProseMirrorPlugins`（逃生舱：直用 PM 原生插件）
- 生命周期：`onBeforeCreate / onCreate / onUpdate / onTransaction / onSelectionUpdate / onFocus / onBlur / onDestroy`
- 三类扩展形态：`Extension`（纯行为）/ `Node`（内容类型，块或内联）/ `Mark`（内联格式），全部同一套钩子。

（Plate 原以为仓库不可解析，实为 `udecode/plate`——它偏"组件库+AI 全家桶"路线，扩展机制不如 TipTap 的声明式钩子干净，维持不选结论。）

### 选型结论

**双内核策略**（Zettlr 验证过的组合）：
1. **正文写作区：TipTap**（必要时上层用 BlockNote 的块模型）。理由：React 集成成熟、扩展即插件的天然形态、社区最大、小说场景的自定义节点（场景分隔、对话块、占位符、幽灵大纲段落——见 06 篇）全部可用 node extension 实现。
2. **大纲/笔记/DSL 编辑区：CodeMirror 6**。理由：我们的开放文本 DSL（06 篇）和 novelWriter 式 `@tag` 语法高亮/校验（01 篇）就是 CM6 的主场，Twine 和 Zettlr 的编辑器扩展点都长在 CM 上（04 篇的 mode/toolbar 契约直接兼容）。

### 从内核白嫖的三条架构不变量

1. **单一变更管线**（PM transaction）：所有编辑（人/AI/撤销/协同）都是 transaction → 审计、undo、diff、AI 审批预览全部免费。**AI 改写必须走同一条管线，禁止旁路 setContent**。
2. **扩展是声明不是补丁**（CM6 extension-as-value）：插件返回"能力描述"，宿主负责装配——禁止插件 monkey-patch 宿主对象。
3. **schema 先行**（PM schema）：文档结构（哪些节点合法、嵌套规则）集中声明，插件贡献节点定义进 schema，而不是各自往 DOM 里塞私货。

## 2. 插件规范四大工业参照

### 2.1 VS Code：贡献点 + 延迟激活 + 进程隔离（综合标杆）

- `package.json` 的 `contributes` 声明一切 UI/命令/设置贡献（菜单、命令面板、侧栏、编辑器操作），宿主渲染——**声明式贡献点**的出处。
- `activationEvents` 按需加载（用到命令才激活插件）——**大而全的性能前提**。
- 扩展跑在独立 **extension host 进程**，与 UI 进程分离：一个扩展崩溃不带走窗口；API 面与内部实现严格分层（proposed API 机制管理未定案接口）。
- 对我们的映射：插件 = manifest（贡献点声明）+ 激活策略（懒加载）+ 运行位置（主进程服务/渲染层 UI/独立 worker）。

### 2.2 Zed：WASM + 接口类型（最新潮流）

- 扩展编译为 **WebAssembly**，宿主用 wasmtime + WIT（WebAssembly Interface Types）定义 ABI：类型安全、跨语言（Rust/Go/JS 都能写）、沙箱天然强。
- **Extension trait 实测**（`crates/extension/src/extension.rs`）：贡献方法即扩展点——`language_server_command`（语言服务器）、`run_slash_command / complete_slash_command_argument`（斜杠命令）、`context_server_command / context_server_configuration`（**MCP context server 也走同一 trait**）、`dap_*`（调试适配器）、`index_docs`（文档索引）、`labels_for_completions/symbols`。宿主通过 `WorktreeDelegate/ProjectDelegate/KeyValueStoreDelegate` 等**能力委托接口**反向给插件受控资源——插件拿不到宿主全量 API，只拿到声明过的委托。
- **版本嵌在制品里**：`parse_wasm_extension_version` 从 wasm 自定义段读扩展 API 版本——兼容性检查不依赖外部元数据文件，制品自描述。
- 扩展仓库中心化审核（extensions.zed.com），语法/主题/语言图标等纯资源包与 wasm 逻辑包并存——**"资源型插件"与"逻辑型插件"二分**。
- 代价：工具链重（开发者要会编 wasm）。对我们的判断：**资源型贡献（主题/模板/写法技能/类型模板）零编译，逻辑型先走 worker/iframe，wasm 留作二期选项**，别为潮流抬高插件开发门槛。

### 2.3 Figma：双线程沙箱 + API 文档体验（安全与开发者体验标杆）

- 插件逻辑跑在**沙箱主线程**（realm 隔离，无 DOM/网络），UI 跑在 **iframe**，两者只能经宿主中转 postMessage——**权限收在宿主手里，UI 与逻辑分离**。
- 插件 API 全部异步、能力显式（网络要声明 `networkAccess`）。
- 文档站是产品级投入（API 参考 + 指南 + 示例仓库）——**插件生态成败一半在文档**。
- 对我们的映射：第三方插件默认 iframe/worker 沙箱 + 桥接 API；manifest 声明权限（文件读写范围、网络、AI 调用配额）。

### 2.4 MCP：AI 能力的插件协议（已成事实标准）

- JSON-RPC 三原语：tools（模型可调用）、resources（可读取上下文）、prompts（可复用模板）+ sampling（反向请求模型）。
- codex 把 MCP 工具适配进自家工具管线（07 篇）；Trilium 用 ETAPI 达成类似效果（03 篇）。
- 对我们的判断：**我们既是 MCP 消费者（接入社区 MCP 工具），更是 MCP 生产者**——把 ai-novel 的"书/章节/卡片/索引"暴露为 MCP server，任何 agent（codex/Claude/我们的内置 agent）都能平等读写。**内核 API-first（03 篇）+ MCP 出口 = 写作工具接入整个 agent 生态，这是"既要 AI"的最优解**。

## 3. 插件规范 v0 合成方案（各家取长补短）

```jsonc
// plugin.json —— 以 codex manifest 为骨架
{
  "name": "webnovel-golden-three-chapters",
  "version": "1.0.0",
  "keywords": ["写法", "开篇"],
  "host": "^0.3.0",                  // ← Twine：宿主版本区间
  "paths": {
    "skills": ["./skills/"],          // ← codex：SKILL.md 写法引擎（07 篇）
    "mcpServers": "./mcp.json",       // ← codex/MCP：逻辑走协议，进程隔离
    "hooks": "./hooks.yml",           // ← harness：能力接缝装饰（fs/tools/events）
    "types": "./types/",              // ← 我们独有：数据类型模板（01/05 篇）
    "ui": "./ui/"                     // ← VS Code 贡献点：槽位声明（launcher/工具栏/面板）
  },
  "interface": { "displayName": "黄金三章", "category": "writing-method",
                 "capabilities": ["read:manuscript", "write:manuscript:proposal"] },
  "activation": "onDemand"            // ← VS Code：懒激活
}
```

Day-1 硬约束（全部来自 harness 社区血泪，08 篇）：
1. 逐插件 try-catch + loaded/failed/skipped 状态面板 + 一键禁用。
2. 命名空间强制：命令 `/plugin:cmd`、事件域、ctx 键前缀。
3. 错误契约：保留 cause 链、按插件归属聚合上报。
4. 可逆注册：插件卸载必须 unwind 全部效果。
5. 权限声明制：读写范围、网络、AI 配额在 manifest 里枚举，宿主强制。

## 4. 行动项

1. 写作区 PoC：TipTap 自定义节点（场景分隔/占位符/幽灵大纲）+ `@tag` 装饰器，两周内出可交互 demo。
2. 大纲/DSL 区 PoC：CM6 + 自定义 language（我们 DSL 的词法/高亮/校验）。
3. 内核 API 层定义 REST/WS 契约（03 篇），MCP server 作为第一个消费者自举验证。
4. 插件规范 v0 RFC：以上面 JSONC 为底，配"错误契约 + 生命周期"两章，先内部评审再公开（吸取 harness"官方不写规范社区代写"的教训）。
