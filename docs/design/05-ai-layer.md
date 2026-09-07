# 05 AI 层设计：工具注册表、写法技能与审批管线

> 依据：codex 五层源码实测 + deepseek-harness 审批路由教训（调研归档于 git 历史）。落点：现有 `shared/services/ai/`（适配器层，质量良好）保留上移，`assistant/` 与 `cards/` 的 4 个硬编码 prompt 服务重构为工具。

## 1. 分层

```
┌ 技能层  skills/（SKILL.md 写法引擎）─────────────── 数据，用户可增 ┐
├ 编排层  ToolRegistry + AgentLoop + Approval ────── core/ai/      ┐
├ 网关层  AiGatewayProvider（5 适配器 + sse/retry/json）─ 主进程     ┐
└ 协议层  会话事件流（rollout 式）+ MCP 双向 ────────── core/ai/    ┐
```

## 2. 工具注册表（`src/core/ai/tools.ts`）

```ts
interface ToolSpec {
  id: string;                       // 'core.outline.generate'，插件工具带命名空间
  description: string;              // 给模型看的
  parameters: JsonSchema;           // 注册期校验：重名/必填语义冲突直接拒绝
                                    //（harness "run_code description 死循环" 教训——schema lint 是宿主职责）
  permission: 'read' | 'write:proposal' | 'write:direct';  // 决定审批档位（§5）
  skillHint?: string;               // 关联技能 id（渐进加载触发器）
  execute(req: ToolCall, ctx: ToolContext): AsyncIterable<ToolEvent> | Promise<ToolOutput>;
}
```

**内置工具首批清单**（现有 4 个 prompt 服务的"工具化"转写，非新增功能）：

| 工具 id | 来源现状 | permission |
|---|---|---|
| `core.text.continue` `core.text.rewrite` | WritingEditor 内联调用 | write:proposal |
| `core.outline.generate` `core.chapter.plan` | StepOutline/StepChapterOutline 的 AI 路径 | write:proposal |
| `core.card.generate` `core.card.command` | aiCardCreationService(532)/aiCardCommandService(131) | write:proposal |
| `core.consistency.scan` | aiSemanticCheckService(404)+worldConsistencyService(544) | read |
| `core.foreshadow.detect` | foreshadowService 的 AI 回收检测 | read |
| `core.index.query` `core.search.semantic` | 索引器/VectorIndex（03 篇） | read |
| `core.recommend.next` | smartRecommendationService(592) | read |
| `core.summary.extract` | summaryExtractionService(115) | write:direct（生成物） |

- 外部 MCP 工具经 `rmcp` 式客户端适配进同一注册表（codex 模式）：schema 消毒 + 命名空间化 + 权限映射（MCP 工具默认 `write:proposal` 起步）。
- **prompt 组装拆为 section 装配器**（harness system-prompt 包模式）：`aiContextBuilder`(454 行) 重写为 `PromptAssembler`——`{identity, bookMeta, indexDigest, activeSkill, toolSchemas, userTask}` 各是独立 section 提供者，插件可插 section（hooks `ai.request`）。

## 3. 写法技能引擎（核心差异化，codex Skills 规范对齐）

```
skills/
├── builtin/
│   ├── golden-three-chapters/SKILL.md   # 网文黄金三章
│   ├── snowflake/SKILL.md               # 雪片法大纲
│   ├── pov-switch/SKILL.md              # POV 转换技巧
│   ├── foreshadow-payoff/SKILL.md       # 伏笔回收检查
│   └── ai-flavor-removal/SKILL.md       # AI 味消除
└── user/…（用户自建，插件可分发）
```

```markdown
---
name: golden-three-chapters
description: 评估/重写网文开篇三章：钩子、金手指亮相、期待感曲线。触发词：开篇、黄金三章
tools: [core.text.rewrite, core.index.query]   # 可选：技能自带工具白名单
---
（完整方法论正文：检查清单、改写策略、反例……按需加载，不常驻 prompt）
```

- **渐进式加载**（codex 实测规范）：会话启动只注入 `{name, description}` 清单（预算上限可配，超限截断描述）；模型显式提及或语义命中才读全文。这直接解决"AI 功能越塞越多、prompt 爆炸"。
- 发现层级：内置 → 用户目录 → 插件技能（04 篇贡献点 #2）→ 书籍级（本书专用写法，frontmatter 声明）。
- **写法 = 数据不是代码**：社区作者/编辑可以直接写 SKILL.md 分发，这是生态最便宜的入口。

## 4. Agent 循环与会话事件流

```ts
// 单轮：assemble → llm → tool_calls? → execute(权限检查) → observe → loop
// 全程事件流落 .novel/ai-sessions/<id>.jsonl（codex rollout 模式）：
type AiEvent =
  | { t:'turn.start'; task; skill?; sections: string[] }
  | { t:'llm.request'; model; tokensIn } | { t:'llm.delta'… } | { t:'llm.done'; tokensOut }
  | { t:'tool.call'; id; toolId; args } | { t:'tool.result'; id; ok; error? }  // error 保 cause 链
  | { t:'proposal.created'; revId; diff } | { t:'approval.decided'; revId; by; verdict }
  | { t:'turn.end'; usage }
```

- 会话可回放/可恢复（崩溃续跑）；"AI 历史"（现有 AIHistoryViewer）升级为事件流浏览器。
- 每个写操作事件带 `toolCallId` → Revision.cause → entity_changes.agentId（03 篇）——**三级审计链闭合**。

## 5. 沙箱 × 审批（07 篇双维度模型）

**沙箱维度**（能力边界）：AI 工具的数据访问经 StoreProvider 权限代理——默认只能触达当前书；`network: false`；文件写限 `books/<active>/`。

**审批维度**（写入门槛），三档：

| 档位 | 行为 | 适用 |
|---|---|---|
| 建议 | 只产出 proposal 文本，不落库 | 续写候选、评分 |
| **改写（默认）** | 变更进 Revision 暂存 → **diff 预览面板** → 用户确认才 apply（走 editor transaction 管线，06 篇） | 重写、润色、批量回收伏笔标注 |
| 重写（full） | 直接 apply 但必存 Revision（可一键回滚） | 用户显式授权的批量操作（AI 味消除全文跑） |

- **多表面路由**（harness ask-user 教训）：审批请求带超时（默认 5min）；桌面弹窗为主表面；未来 Web/IM 表面按 fan-out first-answer-wins；超时降级 = 提案挂起不阻塞（进"待审箱"），绝不静默应用。
- 审批 UI 落在 `AssistantEditPanel` 现有骨架上升级（现状已有 AI 编辑面板雏形）。

## 6. MCP 双向

- **消费**：`mcpServers` 配置进设置（现有 settings 域），外部工具进注册表（§2）。
- **生产**：`core` 的 Store/Index/Build API 封装为 MCP server（stdio，主进程托管）——resources：`book://<id>/toc`、`node://<id>`、`index://refs/<tag>`；tools：读写卡片/章节（写走同一审批管线）。**外部 agent（codex/Claude）与内置 agent 平权**——这是"既要 AI"的架构答案：不赌某个模型赢，把数据开放给整个 agent 生态。
- 自举验证：内置 GlobalAssistant 改为**吃自己的 MCP server**（经网关），证明协议够用。

## 7. 与现状的衔接

| 现状 | 去向 |
|---|---|
| AIService 静态门面 + 5 适配器 + sse/retry/json | 平移进主进程 AiGatewayProvider；渲染层留类型化客户端 |
| aiContextBuilder(454) | 拆为 PromptAssembler sections |
| smartRecommendationService(592) | 拆：推荐规则 → `core.recommend.next` 工具 + 索引查询 |
| aiSemanticCheckService(404) / worldConsistencyService(544) | 合并为 `core.consistency.scan`（消费索引器，03 篇） |
| cardPromptService(626) / aiCardCreationService(532) | 模板 → 技能/section；生成 → `core.card.*` 工具 |
| AIHistoryRecord 类型 | 被事件流取代（保留导出兼容视图一个版本） |
| 提示词模板（prompts/cardPrompts/consistencyPrompts 设置） | 收编为技能 + section 提供者，UI 保留编辑入口 |

## 8. 验收标准

1. 断网/无 Key：全部纯写作功能正常（公理 4）；AI 功能提示未配置原因。
2. 一次 AI 改稿全链路留痕：tool call → proposal → diff → 审批 → transaction → Revision → entity_changes(agentId)。
3. 技能渐进加载：注入清单 token 数 < 500；激活技能后全文注入且可卸载。
4. MCP 出口：用外部 codex CLI 连我们的 server 完成"读大纲→改人物卡→写回"闭环。
5. 审批超时不阻塞：挂起进待审箱，UI 有角标。
