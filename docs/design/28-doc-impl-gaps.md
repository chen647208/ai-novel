# 28 文档已写、代码未落地清单（时点快照）

本文件把设计/特性文档里"规划中、标注后续/待办"的内容与代码现状对账，逐条给状态，
供排期；不做长期正文，落地后从本表移除。审计时点为 2026-09（最近一次更新：完成 24 D2 等后）。

约定：`未做` = 文档已规划、代码无实现；`部分` = 有地基或仅覆盖一部分；`有意挂起` = 已评估并主动不做。

## 未做

| 来源 | 内容 | 现状 |
|---|---|---|
| `23-data-layer-storage.md` §6、`24` D3 | 正文以文件为源（每章一文件 + 清单校验，外部改单章可导入） | 正文仍在 SQLite `nodes.body`，无章节文件与清单（用户明确暂缓） |
| `24` D1 | 追加式事件日志（JSONL）为唯一真相源，SQLite 改为其投影、可重建 | 无事件日志源；SQLite 即真相（用户明确暂缓） |
| `21-plugin-sandbox.md` §5.5 | 插件包 Sigstore/cosign 签名 + 来源白名单 | 现为 Ed25519 签名 + 信任键 + 未签名禁可执行贡献；cosign 需外部工具链 |
| `20-external-benchmark.md` | 借鉴项：选题→大纲→章节→修订→校验工作流、计划/待办落盘 | 参考性结论，未立项 |

## 部分

| 来源 | 内容 | 现状 |
|---|---|---|
| `acceptance-report.md` 已知边界 | 15 个 feature 的组件级 bundle 重构 | 声明与装配树就位，组件逐个迁移中 |
| `18-standardization.md` 批次 E、`features/knowledge.md` | `StepKnowledgeEnhanced` 等超长面板继续拆 | hook 已抽，面板级 JSX 拆分按需进行 |

## 已完成（从本表移除）

- `24` D2 混合检索：FTS5 + 向量 **RRF 融合**（`shared/services/searchService.ts`，向量不可用退化为 FTS）。
- `18` 批次 F.13 类型注册表接 UI：未知类型经 `Project.extensions` 端到端往返（`core/project/bridge.ts`）。
- `04` §13.2 设置表单 `enum` 与嵌套对象（`shared/ui/SchemaForm.tsx`）。
- `25` §6 S5 恢复 UX：备份内容预览 + 条目级选择（`StorageSettingsPanel` + `BackupRestoreDialog`）。
- `features/plugins-and-sync.md`：编辑器解锁态透明解密显示（`EncryptedChapterView`）。
- `22` 编辑器 iframe 受控 https 联网（`permissions.network` 门，`PluginFrame`/`PluginEditorFrame` + 主进程 `plugin-fetch`）。
- `14` 助手后台执行 / 多任务：应用级任务服务串行排队 + 顶栏指示/中止（`assistantTaskService`）。
- `17` §7 文档附件：`attachments`/`blobs` 落地（按书持久化 + 助手附件库 `SavedAttachmentsButton`）。
- `12` 批量操作：书库多选批量删除/打标（`Bookshelf` 选择态 + `useBookActions.deleteBooks`）。

## 有意挂起 / 评估后不做

- 动态 `connect-src` 端点白名单（`27` §4）：端点用户自定义，静态白名单会误伤。
- MCP 独立 server 鉴权：stdio 子进程环境由启动方控制，token 无鉴别意义；已只读 + 客户端启动需原生批准。
- 多人协作 / CRDT / 分布式：在"不做清单"，非请勿动。

## 来源

- 上述设计文档与 `docs/features/`、`docs/guides/acceptance-report.md`。
