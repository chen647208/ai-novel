# AI 调用层架构

AI 调用核心位于 `src/renderer/shared/services/ai/`，采用「适配器 + 门面」结构，统一处理多 Provider、流式、取消、重试与结构化输出。

## 分层

- `types.ts`：内部类型（`ChatMessage`、`CallOptions`、`ProviderAdapter`、`AIRequestError`、`TokenUsage`）
- `resolve.ts`：按 `ModelConfig.provider` 解析适配器
- `adapters/openai-compatible.ts`：OpenAI Chat Completions 兼容协议（覆盖 `openai-compatible`、`ollama`、以及走 `/v1beta/openai/` 端点的 Gemini）
- `adapters/gemini.ts`：Gemini 原生（REST `generateContent` / `streamGenerateContent?alt=sse`，或 `@google/genai` SDK 的 `generateContentStream`）
- `sse.ts`：增量 SSE 解析器（跨网络分片缓冲，杜绝行边界丢数据）
- `retry.ts`：指数退避 + 抖动重试，识别可重试错误（网络 / 429 / 5xx），遵守 `Retry-After`
- `messages.ts`：消息构建、输出清洗、token 提取、错误响应读取等共用工具
- `json.ts`：`callJSON` 结构化输出，解析/校验失败时携带错误自动请求修复重试

## 门面

`features/assistant/services/aiService.ts` 的 `AIService` 保留历史静态 API，内部委托适配器：

- `AIService.call(model, prompt, options?)` → 一次性补全，错误经 `AIResponse.error` 返回，不抛出
- `AIService.callStreaming(model, prompt, onChunk, options?)` → 流式；不支持流式时降级为传统模式（提示置于 `notice` 而非 `error`）
- `AIService.callJSON<T>(model, prompt, options?)` → 结构化 JSON
- `AIService.testConnection` / `buildHistoryRecordData`

`options` 支持 `{ signal, retries }`：`signal` 用于取消（停止生成），`retries` 控制瞬时失败重试次数。

## 流式契约

`onChunk` 收到的 `StreamingAIResponse.content` 为**累计全文**（非增量），完成时 `isComplete = true`。调用方应直接替换展示内容，不要二次累加。

## 取消

调用方创建 `AbortController` 并把 `signal` 传入；中止后适配器以 `error: '生成已取消'` 收尾，调用侧据此静默复位状态（不当作失败弹窗）。

## 扩展新 Provider

1. 在 `adapters/` 下实现 `ProviderAdapter`（`supportsStreaming` / `complete` / `stream`）。
2. 在 `resolve.ts` 的 `switch` 中登记。
3. 复用 `sse.ts`、`retry.ts`、`messages.ts` 的通用能力。
