# 04 插件系统设计：manifest v0、贡献点与运行时

> 依据：research/09（合成方案）+ 07（codex manifest 实测）+ 04（Twine 版本区间/函数契约）+ 08（harness 社区设计债 → day-1 清单）。
> 定位声明：插件规范是**产品地基**不是扩展选项——功能广度靠生态供给（05 篇 bibisco 教训），核心只做数据模型 + 扩展机制。

## 1. manifest v0（`plugin.json`，schema 在 `src/core/plugin/manifest.ts` 定义）

```jsonc
{
  "$schema": "https://ai-novel.dev/schema/plugin-v0.json",
  "id": "com.example.golden-three-chapters",   // 反向域名，全局唯一，命名空间根
  "name": "golden-three-chapters",
  "version": "1.0.0",
  "description": "网文黄金三章开篇法",
  "keywords": ["写法", "开篇", "网文"],
  "host": "^2.0.0",                             // ★ Twine 模式：宿主版本区间
  "license": "MIT",
  "engine": "ts2024",                           // 逻辑型插件的运行时要求

  "contributes": {
    "types":        ["./types/"],               // 类型模板（03 篇）——资源型，零编译
    "skills":       ["./skills/"],              // SKILL.md 写法技能（05 篇）——资源型
    "buildProfiles":["./builds/"],              // Build Profile（07 篇）——资源型
    "commands":     ["./commands.json"],        // 命令声明（含 UI 菜单位置）
    "ui":           ["./ui.json"],              // 槽位贡献（§4）
    "mcpServers":   { "inline": { "graph-query": { "command": "..." } } },
    "hooks":        "./hooks.yml",              // 能力接缝装饰（§5）
    "editor":       "./editor.js",              // 逻辑型：TipTap/CM6 扩展（沙箱内）
    "renderers":    "./renderers.json"          // 导出渲染器（07 篇）
  },

  "permissions": {
    "read":  ["manuscript", "cards", "index"],   // 数据域枚举白名单
    "write": ["cards"],
    "network": false,
    "ai":    { "quotaPerHour": 20 }
  },
  "activation": "onDemand",                      // VS Code 模式：懒激活
  "interface": {                                 // codex 市场元数据（分发用）
    "displayName": "黄金三章", "category": "writing-method",
    "capabilities": ["read:manuscript", "write:cards"],
    "defaultPrompt": ["用黄金三章法重写第一章"],
    "logo": "./icon.svg", "screenshots": []
  }
}
```

**规则**（写进 schema 校验器，加载即验证）：
1. `contributes` 的每个键是**声明**，宿主负责装配；插件代码不得 monkey-patch 宿主对象（CM6 extension-as-value 原则，09 篇）。
2. 函数契约显式化（Twine 模式，04 篇）：所有被宿主回调的函数必须**同步、无副作用、幂等（会被反复调用）**；异步逻辑只能经 `ctx.events` 与 `ctx.tasks`。违反者由沙箱运行时强制（worker 内冻结 window/globalThis 非必要面）。
3. 版本区间不得重叠；无匹配区间 = 该贡献整体失效并上报（不静默半生效）。
4. 资源型贡献（types/skills/buildProfiles）零代码、可热重载；逻辑型（editor/hooks/mcpServers）走沙箱。

## 2. 生命周期与故障隔离（harness 血泪 → day-1 硬约束）

```
discover → validate(manifest+版本区间) → load(逐插件 try-catch)
        → activate(懒：首次触达贡献点才激活)
        → deactivate → unwind(逆序回滚全部注册)   ← 可逆注册不变量
```

```ts
type PluginState = 'loaded'|'active'|'failed'|'disabled'|'uninstalled';
interface PluginStatus { id: string; state: PluginState; error?: PluginError; activatedAt?: number; }
```

- **逐插件 try-catch**：任何一插件在任一阶段抛错只标记自身 `failed`，其余照常（harness 2026-08-25 事故的直接教训）。
- **状态面板**（内置 UI）：loaded/failed/skipped 汇总 + 每插件错误详情 + **一键禁用**（配置级 `disabled: string[]`，不碰文件）。
- **错误契约**：`PluginError { pluginId, phase, message, cause: unknown[] }`——cause 链完整保留（harness"吞 cause"帖教训），终端/日志/状态面板三处可见同一 cause。
- **unwind 不变量**：注册返回 `Disposable`，插件卸载/禁用时逆序释放（harness Cordis 唯一值得全盘照抄的机制）。core 的注册表 API 一律返回 Disposable。

## 3. 命名空间（防冲突，harness `/plugin:command` 提案落地）

| 资源 | 规则 | 示例 |
|---|---|---|
| 命令 | `/<plugin-short-id>:<cmd>` | `/golden3:rewrite-opening` |
| 类型模板 | `<plugin-short-id>.<type>` | `drama.script-scene` |
| 事件域 | `plugin.<id>.<event>` | `plugin.golden3.chapter-scored` |
| 设置键 | `plugin.<id>.*` | 存 settings 表 |
| 存储命名空间 | 插件私有数据进 `plugin-data/<id>/` | — |

内置功能同样吃规则（`core.character`、`/core:export`）——dogfooding 保证命名空间不是摆设。

## 4. 贡献点详表（9 类，v0 先开 3 类）

| # | 贡献点 | 形态 | 开放期 |
|---|---|---|---|
| 1 | **类型模板** | 资源（JSON/TS 声明） | **v0** |
| 2 | **技能 SKILL.md** | 资源（Markdown） | **v0** |
| 3 | **Build 渲染器/变换器** | 资源+逻辑 | **v0** |
| 4 | 命令 + 菜单位置 | 声明 + 回调 | v1 |
| 5 | UI 槽位（见下） | 声明 + 沙箱组件 | v1 |
| 6 | 编辑器扩展（TipTap/CM6） | 逻辑（worker） | v1 |
| 7 | MCP server | 外部进程 | v1（内置先吃） |
| 8 | hooks（能力接缝） | 声明式策略 | v2 |
| 9 | 主题/字体/图标 | 资源 | v2 |

**UI 槽位系统**（Trilium Launcher 模式扩展）：固定槽位枚举 `bookshelf-item | workspace-nav | sidebar-panel | editor-toolbar | editor-context | command-palette | status-bar | aux-window`。插件声明 `{slot, component, when?}`，宿主渲染；用户可在设置里对"可见/可用"两态增删（launcher 的可见性模型）。

## 5. 能力接缝（hooks，harness capability-seams 概念）

三条官方接缝，插件挂策略不侵入实现：
- `fs/*`：读写拦截（如"禁止插件写 novel/ 目录"）
- `ai/*`：请求/响应拦截（如"注入风格约束"、"敏感词过滤"）
- `index/*`：索引事件订阅（如"人物卡变更 → 自动重跑图谱"）

hooks.yml 声明式：`{ on: 'ai.request', do: 'inject', where: 'system', text: '...' }`——简单装饰零代码，复杂逻辑才上 mcpServers。

## 6. 沙箱与权限执行

- **资源型**：无代码，schema 校验即安全。
- **逻辑型（editor/ui）**：渲染层 Web Worker（无 DOM）+ 桥接 API；UI 组件走 iframe（Figma 双线程模式，09 篇）。宿主按 `permissions` 枚举代理一切数据访问——worker 拿到的 `ctx` 是权限裁剪后的代理对象。
- **外部进程型（mcpServers）**：进程隔离 + 工作目录白名单；密钥经主进程注入不进插件环境。
- 权限声明缺失 = 默认拒绝（deny-by-default）；`permissions.write` 未声明的写请求在 StoreProvider 层直接抛 `PermissionDenied`。

## 7. 组合发行：bundle / profile / patch（harness 模式）

```
profiles/
├── minimal.yml        # 核心 + 纯写作（禁全部 AI 的发行档，公理 4 的实体化）
├── webnovel.yml       # + 黄金三章/断章钩子/追读分析/番茄导出
└── literary.yml       # + 雪片法/人物弧线/EPUB 精装导出
bundles/               # 功能包：一组贡献 + 依赖声明
patches/               # 用户级 cordis.patch 式覆盖：按 id 替换/禁用任意装配行
```

- 内置 15 个 feature 在 M3 逐个改造为 bundle（08 篇）——**官方插件与社区插件同一加载路径**（dogfooding）。
- `装配树查看器`（内置 UI）：打印当前 profile 的完整装配（每行来源 bundle/patch），任何一行可右键"生成 patch 覆盖"——harness `--dump-config` 的 GUI 版。

## 8. 事件总线（三层事件域，harness 架构实测）

```ts
interface Event Bus {
  // 1. 持久事实：进 entity_changes/session log，reload 后仍在
  fact(type: 'node.changed'|'ai.approved'|'build.completed', payload)
  // 2. 活体拦截：agent/*、editor/*，可 observe 可 veto（审批类）
  intercept(type: 'ai.request'|'editor.transaction', handler): Disposable
  // 3. 能力接缝装饰：fs/*、ai/*、index/*（§5）
  decorate(seam: 'fs'|'ai'|'index', policy): Disposable
}
```

事件清单文档化（producer/consumer 表，harness event-map 模式），CI 校验事件名注册。

## 9. 许可证与生态边界

- 宿主 AGPL-3.0 不变。**插件 SDK（`@ai-novel/plugin-sdk`，类型+运行时垫片）单独 MIT 发布**——避免许可证传染吓退生态，同时 AGPL 对"改宿主"仍然有效。
- 插件是独立作品：经公开 API/协议交互，不链接宿主内部——这条写进插件规范 FAQ。

## 10. 验收标准

1. manifest schema 校验器 + 错误信息定位到 JSON 路径。
2. 故障隔离测试：注入一个 load 期抛错的插件 → 其余插件全部可用、状态面板正确、一键禁用生效。
3. unwind 测试：禁用插件后其注册的命令/类型/事件全部消失，重新启用恢复。
4. 命名空间冲突测试：两个插件注册同名类型 → 各自前缀化，互不覆盖。
5. 权限测试：未声明 write 的插件写数据 → PermissionDenied 且 cause 链完整。
