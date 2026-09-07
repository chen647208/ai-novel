# 助手功能说明

## 适用范围

全局助手（AI 写作助手）：聊天、Agent 工具调用、三档审批、会话事件留痕、
智能推荐。对应代码位于 `src/renderer/features/assistant`。

## 核心文件

- `GlobalAssistant.tsx`：固定右侧边栏（显隐开关、Ctrl+J、左框拖动调宽并持久化）
- `components/AssistantChatWorkspace.tsx`：聊天记录展示、模板选择、附件、输入区
- `components/AssistantContextPanel.tsx`：上下文分析与项目快照面板
- `components/AssistantEditPanel.tsx`：项目数据编辑面板
- `components/ApprovalHost.tsx`：审批对话框 + 待审箱角标（write 档操作经用户批准）
- `components/SessionEventBrowser.tsx`：会话事件流回放（AI 历史的事件浏览器形态）
- `services/aiRuntime.ts`：应用级 AI 运行时单例（assembler/registry/catalog/broker/sessionManager）
- `services/aiSessionManager.ts`：会话管理器——jsonl 落盘、技能渐进注入、工具编排
- `services/builtinTools.ts`：内置工具（卡片生成/命令解析/一致性扫描/推荐/索引查询/章节目录与正文/大纲/人物清单/知识读写/全文与语义检索/续写/重写/大纲/章节细纲）
- `services/skillCatalogSetup.ts`：内置 5 写法技能装载（黄金三章/雪片法/POV/伏笔回收/AI 味消除；SKILL.md 以 `?raw` 打包进渲染端，离线可用；触发词命中会话内自动激活全文，会话结束即卸载）
- `services/smartRecommendationService.ts` / `aiSemanticCheckService.ts`：推荐与语义检查（经工具注册表暴露）

## 运行链路

普通对话消息 → `AiSessionManager.run`：

1. `ai.request` 拦截门（minimal 发行档在此整体否决 AI）
2. PromptAssembler 装配（身份/作品/世界观/索引摘要/工具清单/激活技能/任务）
3. 网关补全 → 解析 `{reply, toolCalls}` JSON 协议
4. 工具按 permission 三档路由：read 直通、write:proposal 弹审批、
   write:direct 直接生效并留审计
5. 工具结果回填 → 循环（默认 30 轮上限；末轮硬切文本收口，同调用连调三轮判转圈停止）→ 最终答复进聊天区

 触发词命中的写法技能会话内自动激活全文，会话结束即卸载。

## 会话记忆与压缩

- 每次发送携带近期对话（报错消息剔除），经 `history` section 注入（`userTask` 之前）；
  截断三档见 `shared/constants/chat.ts`。
- 超阈值自动压缩：最旧一半调模型写摘要，后续携带"摘要 + 新轮"；
  摘要失败降级为硬截断。清空聊天同时清除摘要。
- 用户消息 Agent 分支必推进历史流；头栏"重新生成"按上轮原文重跑，旧答案保留。

斜杠建卡（`/角色` 等）不走对话循环：解析成功后同样经审批弹框，
批准才落库，拒绝/超时进待审箱——与工具写提案同标准。

## 会话留痕

每轮全程事件化（turn/llm/tool/approval）落
`userData/ai-sessions/<bookId>/<sessionId>.jsonl`；
「AI 历史 → 会话事件流」页签可回放。审批待审箱：超时或手动搁置的
write 请求挂起，顶栏待审箱角标可逐条决定，绝不静默应用。

## 无可用模型时的行为

- 可用口径与写作区一致（`isModelUsable`）：发送、上下文分析、角色生成三按钮
  同步禁用（悬停显示原因）；回车发送等旁路走执行层拦截，在聊天区提示缺模型。
- 模型下拉框无可用模型时显示占位选项，仍可切换以便去设置配置。

## 外部 agent 平权

MCP server（`node build/main/main/mcp/server.js`，在仓库根目录执行）暴露读工具与写提案；
外部 agent 的写提案经 `pending-proposals.jsonl` 进入同一待审箱，
用户批准后由执行器真实落库（章节写先补快照，卡片写走命令管线、
失败回落知识库），标注 `ai:mcp`——与内置助手同权同源。
