# AI 调用层架构

AI 调用采用「主进程网关 + 渲染端客户端 + 工具/审批/会话」四层（design/05）。
适配器协议实现位于**主进程** `src/main/ai/`，API Key 不进入渲染端。

## 分层

```
┌ 技能层   SkillCatalog（SKILL.md 渐进注入）──────── src/core/ai/skills.ts
├ 编排层   ToolRegistry / AgentLoop / ApprovalRouter ── src/core/ai/
├ 网关层   AiGatewayProvider（主进程）──────────────── src/main/ai/
└ 协议层   会话事件流（jsonl）+ MCP 双向 ───────────── src/main/mcp/ + core/ai/session
```

## 主进程网关（src/main/ai/）

- `gateway.ts`：AiGatewayProvider——IPC `ai:complete` / `ai:stream:open` /
  `ai:stream:event` / `ai:stream:abort`；流式按 requestId 多路推送；
  不支持流式的模型降级为一次性补全（结果块带 notice）。
- `adapters/`：anthropic / gemini（原生 + OpenAI 兼容端点 + SDK）/ openai-compatible
  （含 ollama）/ openai-responses 四适配器 + `sse`（增量解析）/ `retry`
  （指数退避、Retry-After）/ `messages`（构建/清洗/用量提取）。
- 缓存：anthropic 在 system 块与末条 user 消息打 ephemeral 断点（对标 OpenCode，
  Agent 循环前缀稳定可复用，用量透出 cacheRead/cacheWrite）；
  openai/gemini 走服务端自动前缀缓存，无需客户端标记。
- `i18n.ts`：主进程独立 i18next 实例（errors 命名空间），字典与渲染端同源
  `src/shared/i18n`。

## 渲染端（src/renderer/shared/services/ai/）

- `gatewayClient.ts`：类型化客户端（渲染端唯一出口）。契约：
  complete/stream 不抛错，失败经 `AIResponse.error` / 最终 onChunk 块返回。
- `json.ts`：`callJSON` 结构化输出 + 修复重试（validate 函数不可跨 IPC，
  编排留在渲染端）。
- `AIService` 门面（features/assistant/services/aiService.ts）：静态 API
  `call / callStreaming / callJSON / testConnection`，内部委托网关客户端。

## 线上契约

- `AiCallOptions { retries }` 跨 IPC；AbortSignal 不跨进程——取消经
  requestId 走 `ai:stream:abort`。
- 流式 `onChunk` 的 `content` 为**累计全文**，完成时 `isComplete = true`；
  降级 notice 经最终块 `notice` 字段透传。
- `AiStreamEvent`：delta（累计值）/ done（最终块）/ error，按 requestId 分发。

## Agent 循环与工具（src/core/ai/）

- `agentLoop.ts`：assemble（PromptAssembler）→ llm → 解析
  `{reply, toolCalls}` JSON 协议 → 审批（三档）→ execute → 观察回填 → 循环。
- `tools.ts`：ToolRegistry（首批 9 内置工具 + 插件贡献）；permission 三档。
- `approval.ts`：ApprovalBroker（超时降级待审箱）+ ApprovalRouter。
- `session.ts`：AiEvent 事件流落 `ai-sessions/<bookId>/*.jsonl`。
- `skills.ts`：SKILL.md 渐进注入（清单预算、激活/卸载、触发词匹配）。

详细交互规范见 `design/05-ai-layer.md` 与 `design/04 §3.1`。
