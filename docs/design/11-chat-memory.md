# 11 会话记忆与压缩（对标 codex session 语义，不抄实现）

## what

助手从"单发任务机"变成"聊天搭子"，三件套：

1. **会话记忆**：每次发送携带最近 N 轮对话（user/assistant 文本），经新内置
   section `history` 注入装配器（order 90，紧贴 `userTask` 之前）。
2. **超长压缩**：历史原文超阈值时，用当前模型把最旧的一半写成摘要，
   后续携带"摘要 + 最近轮"，codex compact 同语义。
3. **重试按钮**：聊天头加"重新生成"，丢弃最后一条助手答复，按上轮原文重跑。

## why

- 现状证据：`sendMessageInternal` 每次新建 `sess_` 会话，`RunSessionInput` 无
  历史字段，"刚才那个角色改一下"类追问必然失忆——UI 长得像聊天，行为不是。
- 生成失败/不满意只能手动重跑；Sudowrite / NovelAI / SillyTavern swipe 皆有重试。

## 设计

- `RunSessionInput.history?: Array<{ role: 'user' | 'assistant'; content: string }>`；
  `sessionManager.run` 截断（轮数 + 单轮字数 + 总字数三档）后写入
  `context().extra.historyText`，`historySection` 只渲染该字符串。
- 纯函数（可单测）：`buildHistoryText(messages, caps)`、
  `needsCompaction(rawText)`、`splitForCompaction(turns)`，放
  `aiSessionManager.ts` 同级纯模块或其内导出。
- 压缩触发与执行在 `GlobalAssistant`（持有 messages 与模型）：
  超阈值 → `AIService.call` 写摘要 → state 存摘要 → 后续历史 = 摘要 + 新轮；
  摘要失败则降级为硬截断（不断流）。
- 重试：`lastUserText` ref 记录上轮原文；点击先删最后一条助手消息再重发；
  无可用模型时与发送键同口径禁用。
- 常量收 `shared/constants`（改值只改一处）：轮数/单轮字数/总字数/压缩阈值/摘要上限。

## 验收标准

1. 单测：历史截断三档生效；超阈值触发压缩调用；摘要失败降级不断流；
   `history` section 渲染位置在 `userTask` 之前。
2. 手工：连问两轮，第二轮能指代首轮实体；超长会话触发一次压缩后继续可聊；
   重试恢复上轮答案（旧答案保留在历史流）。
3. 不回归：`verify` 全绿；无模型时三处入口行为不变（禁用+提示）。
