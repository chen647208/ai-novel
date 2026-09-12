# 17 行业基线补齐：数据安全、合规、AI 可靠性、无障碍

本文件是缺口清单与验收标准（what/why/验收）。逐批实现，每批独立提交并跑 `npm run verify`。
盘点方法与证据见各条目的"现状"。

## what / why

对标成熟桌面创作工具（Scrivener / Obsidian / Cursor / Cherry Studio / LibreChat / OpenWebUI / VS Code）
的工程基线，补齐本项目缺失的通用能力。缺口按风险分四组：

### P0 数据安全与一致性

1. **单实例锁**：启动 `app.requestSingleInstanceLock()`；未获锁即退出，获锁后监听 `second-instance`
   还原并聚焦已有窗口。现状：无，两个实例可同时写同一 `hongyue.db` 与 `vault.json`。
2. **退出串行清理**：`before-quit` 中阻止默认退出，await `container.shutdown()`（关 SQLite、MCP 子进程、
   中止 AI 流）后再 `app.quit()`，带超时兜底。现状：`shutdown` 为 fire-and-forget。
3. **退出前刷盘**：窗口关闭/应用退出前强制 `persistenceBridge` flush 未落库差分。现状：仅 10 秒定时刷盘。
4. **保存失败可见 + 退避重试**：落盘失败发 toast、指数退避重试、状态指示。现状：仅写日志，UI 无感。
5. **数据库完整性**：启动 `PRAGMA quick_check`，损坏时提示并从最近备份恢复；设置页提供 `VACUUM` / `REINDEX`。
   现状：无检测。
6. **外键声明**（不采纳）：设计不变量 #3 允许乱序写入骨架实体（边可先于目标节点存在），
   外键约束会破坏该能力；参照完整性由 Repository 层保证（v3 补 `idx_edges_to` 反向索引）。
7. **二进制实体**：`attachments`/`blobs` 属 `docs/design/03` 定义的六实体模型（二进制内容规划），
   已被助手文档附件消费：按书持久化参考文件的元数据与二进制。

### P0 合规与供应链

8. **第三方许可证**：生成 `THIRD-PARTY-LICENSES.md`；发行包不得排除第三方 license 文本（改
   `electron-builder.yml` 的排除规则）。现状：AGPL 分发缺第三方许可证清单，且主动排除。
9. **依赖许可证扫描**：脚本扫描运行期依赖许可证白名单，进 CI。现状：无。
10. **CodeQL/SAST**：GitHub CodeQL 工作流（JS/TS）。现状：无。
11. **Electron 加固**：`@electron/fuses`（`RunAsNode=false`、`EnableNodeOptionsEnvironmentVariable=false`、
    `OnlyLoadAppFromAsar=true`、`EnableEmbeddedAsarIntegrityValidation=true`）在打包后改写；asar 完整性。
    现状：无。

### P1 AI 可靠性

12. **请求超时 / 流空闲超时**：每渠道可配 `timeoutMs`，默认 60s；流空闲默认 30s。现状：无，只能手动停。
13. **备用模型降级**：主模型失败（可重试耗尽）后按顺序尝试备用渠道。现状：无。
14. **用量配额拦截**：消费 `quotaPerHour`（现已声明未用），超限拦截并提示。现状：空声明。
15. **prompt injection 防护**：工具/MCP/RAG 返回内容以不可信分隔标注，system 声明优先级；对疑似指令注入告警。
    现状：原样回填 prompt。
16. **费用估算**：内置定价表（models.dev 口径），按 token 估算并展示会话/累计成本。现状：只有 token 数。

### P1 用户体验与无障碍

17. **未保存离开确认**：编辑器脏状态时切章、切分区、关窗触发"保存/丢弃/取消"。现状：无。
18. **命令面板**：`Ctrl/Cmd+K` 模糊搜索命令、跳转、最近文件。现状：无。
19. **渲染进程全局错误处理**：`window.onerror` + `unhandledrejection` 汇入 logger/toast。现状：仅主进程有。
20. **离线检测**：`online/offline` 事件，离线禁用 AI 并提示本地可用。现状：无。
21. **a11y 基线**：`prefers-reduced-motion`、流式/错误 `aria-live`、对比度达标（warning/success/border）、
    `eslint-plugin-jsx-a11y` + axe 断言、对话框可访问名与焦点陷阱。现状：多项缺失。
22. **性能**：长列表虚拟化、`React.lazy` 代码分割、主包体积门禁。现状：主包约 2.4MB、无分割。

### P2 工程配套

23. `SECURITY.md`、`CODE_OF_CONDUCT.md`、Issue 模板、`.editorconfig`、`.nvmrc`。
24. husky + lint-staged + commitlint（提交前 lint）。
25. SDK / VS Code 扩展的 LICENSE 文件与发布流水线。
26. E2E：retries + trace + 视觉回归基线。
27. 渲染层日志落盘（诊断包纳入）。
28. 系统集成：原生通知、文件关联、`shell.showItemInFolder`、系统回收站。

## 验收标准

- 单实例：二次启动不产生新窗口，聚焦已存在窗口；日志有记录。
- 退出：关窗到进程结束期间，DB 已关闭、MCP 子进程已回收（可通过日志/诊断验证）。
- 保存失败：模拟写失败时出现错误 toast，恢复后自动重试成功。
- 完整性：损坏的 db 启动时给出可读提示与"从备份恢复"入口。
- 合规：仓库含 `THIRD-PARTY-LICENSES.md`；打包产物含第三方 license；`license:scan` 进 verify/CI。
- 加固：打包产物 fuses 已按清单改写；asar 完整性开启。
- AI：上游挂起在超时后中止并报错；主模型失败按配置回退；超配额被拦截；工具观察带不可信标注。
- UX：脏编辑器关窗弹确认；`Ctrl+K` 打开命令面板；渲染层异常产生日志与提示；离线时 AI 入口禁用。
- a11y：`prefers-reduced-motion` 生效；流式容器 `aria-live`；对比度达 WCAG AA；jsx-a11y error；关键弹窗 axe 无严重项。
- 每批 `npm run verify` 全绿，运行时/UI 改动跑 `npm run test:e2e`。
