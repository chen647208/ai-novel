# 助手功能说明

## 适用范围

全局助手（AI 写作助手）：聊天、Agent 工具调用、三档审批、会话事件留痕、
智能推荐。对应代码位于 `src/renderer/features/assistant`。

## 核心文件

- `GlobalAssistant.tsx`：全局助手主编排器（聊天区、面板切换、停止生成）
- `components/AssistantChatWorkspace.tsx`：聊天记录展示、模板选择、附件、输入区
- `components/AssistantContextPanel.tsx`：上下文分析与项目快照面板
- `components/AssistantEditPanel.tsx`：项目数据编辑面板
- `components/ApprovalHost.tsx`：审批对话框 + 待审箱角标（write 档操作经用户批准）
- `components/SessionEventBrowser.tsx`：会话事件流回放（AI 历史的事件浏览器形态）
- `services/aiRuntime.ts`：应用级 AI 运行时单例（assembler/registry/catalog/broker/sessionManager）
- `services/aiSessionManager.ts`：会话管理器——jsonl 落盘、技能渐进注入、工具编排
- `services/builtinTools.ts`：内置工具（卡片生成/命令解析/一致性扫描/推荐/索引查询/续写/重写/大纲/章节细纲）
- `services/skillCatalogSetup.ts`：内置 5 写法技能装载（黄金三章/雪片法/POV/伏笔回收/AI 味消除）
- `services/smartRecommendationService.ts` / `aiSemanticCheckService.ts`：推荐与语义检查（经工具注册表暴露）

## 运行链路

普通对话消息 → `AiSessionManager.run`：

1. `ai.request` 拦截门（minimal 发行档在此整体否决 AI）
2. PromptAssembler 装配（身份/作品/世界观/索引摘要/工具清单/激活技能/任务）
3. 网关补全 → 解析 `{reply, toolCalls}` JSON 协议
4. 工具按 permission 三档路由：read 直通、write:proposal 弹审批、
   write:direct 直接生效并留审计
5. 工具结果回填 → 循环（maxTurns 上限）→ 最终答复进聊天区

触发词命中的写法技能会话内自动激活全文，会话结束即卸载。

## 会话留痕

每轮全程事件化（turn/llm/tool/approval）落
`userData/ai-sessions/<bookId>/<sessionId>.jsonl`；
「AI 历史 → 会话事件流」页签可回放。审批待审箱：超时或手动搁置的
write 请求挂起，顶栏待审箱角标可逐条决定，绝不静默应用。

## 外部 agent 平权

MCP server（`node build/main/main/mcp/server.js`）暴露读工具与写提案；
外部 agent 的写提案经 `pending-proposals.jsonl` 进入同一待审箱，
由用户批准——与内置助手同权同源。
