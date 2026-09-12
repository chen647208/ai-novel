# 28 文档已写、代码未落地清单（时点快照）

本文件把设计/特性文档里"规划中、标注后续/待办"的内容与代码现状对账，逐条给状态，
供排期；不做长期正文，落地后从本表移除。审计时点为 2026-09。

约定：`未做` = 文档已规划、代码无实现；`部分` = 有地基或仅覆盖一部分；`有意挂起` = 已评估并主动不做。

## 未做

| 来源 | 内容 | 现状 |
|---|---|---|
| `23-data-layer-storage.md` §6、`24` D3 | 正文以文件为源（每章一文件 + 清单校验，外部改单章可导入） | 正文仍在 SQLite `nodes.body`，无章节文件与清单 |
| `24` D1 | 追加式事件日志（JSONL）为唯一真相源，SQLite 改为其投影、可重建 | 无事件日志源；SQLite 即真相；`entity_changes` 只是审计表 |
| `24` D2 | 混合检索：FTS5 + `sqlite-vec`，RRF 融合 | 仅 FTS5；向量为独立 `vectra`（无同库融合） |
| `18-standardization.md` 批次 F.13 | 类型注册表接 UI：`bridge.ts` 读注册表、未知类型落 `project.extensions[type]` | `bridge.ts` 仍写死 `COLLECTIONS`，未知类型无兜底 |
| `04-plugin-system.md` §13.2 / `SchemaForm.tsx` | 插件设置表单支持 `enum` 与嵌套对象 | 仅 string/number/integer/boolean |
| `14-assistant-advanced.md` | 后台执行 / 多任务 | 未实现（图片附件、计划模式、MCP 客户端已落地） |
| `21-plugin-sandbox.md` §5.5 | 插件包 Sigstore/cosign 签名 + 来源白名单 | 现为 Ed25519 签名 + 信任键 + 未签名禁可执行贡献 |
| `22-plugin-logic-contributions.md` | 编辑器 iframe 经宿主受控 HTTP 联网 | iframe 为 null-origin 无网络，未提供受控 HTTP |
| `17-industry-gaps.md` | `attachments` / `blobs` 六实体用于文档附件 | 表已建但无 UI 消费（空转） |
| `features/plugins-and-sync.md` | 编辑器渲染的透明集成（解锁态自动解密显示） | 未接入（需先解锁，编辑区不透明解密） |
| `20-external-benchmark.md` | 借鉴项：选题→大纲→章节→修订→校验工作流、计划/待办落盘 | 参考性结论，未立项 |

## 部分

| 来源 | 内容 | 现状 |
|---|---|---|
| `25-data-safety.md` §6 S5 | 恢复向导入导出体验（选择备份、预览、回滚） | 备份列表/恢复/恢复前快照已有；内容预览与条目级选择未做 |
| `27-ipc-hardening.md` §6 I3 | 动态 `connect-src` 端点白名单 | 有意挂起（端点用户自定义，静态白名单会误伤；见 §4） |
| `acceptance-report.md` 已知边界 | 15 个 feature 的组件级 bundle 重构 | 声明与装配树就位，组件逐个迁移中 |
| `18-standardization.md` 批次 E、`features/knowledge.md` | `StepKnowledgeEnhanced` 等超长面板继续拆 | hook 已抽，面板级 JSX 拆分按需进行 |
| `12-writing-manage.md` | 批量操作 / 卡片视图 | 视图切换与部分批量入口存在，未按文档全量落地 |

## 有意挂起 / 评估后不做

- `27` I2 之外：`db.exec` 已收敛为 id 通道；动态 CSP 单独立项。
- MCP 独立 server 鉴权：stdio 子进程环境由启动方控制，token 无鉴别意义；已只读 + 客户端启动需原生批准。
- 多人协作 / CRDT / 分布式：在"不做清单"，非请勿动。

## 来源

- 上述设计文档与 `docs/features/`、`docs/guides/acceptance-report.md`。
