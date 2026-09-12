# 26 成熟度缺口清单（时点快照）

本文件是 2026-09 一次全维度审计的时点快照，用于排期修复，不做长期正文。
审计方式：五个方向只读排查（性能/可观测性、测试与 UI 状态、安全与供应链、数据层与发布/DX、AI 层与插件），
逐条给出证据位置与修复方向。修复落地后从本表移除，功能现状回写 `docs/features/`。

约定：`[H]` 高（数据安全/安全/正确性）、`[M]` 中、`[L]` 低。批次列表示计划归组的修复批次。

## 1. 性能与可观测性

| 严重度 | 位置 | 问题 | 修复方向 | 批次 |
|---|---|---|---|---|
| H | package.json:65 | 无基准/剖析脚本，启动/保存/检索均无度量点 | 加 bench 脚本 + 关键路径 `performance.now()` 埋点 | B0 |
| H | app/stores/persistenceBridge.ts:184 | store 每次变化即 flush，配合每按键写入，逐字符落盘 | 桥内加 300–500ms 去抖合并 | B1 |
| H | repository/sqliteRepository.ts:445 | saveProject 先删全书再逐行重插，改一章重写全书 | 按实体 hash 差分 upsert/delete | B2 |
| H | repository/sqliteRepository.ts:453 | 循环内逐条 `await tx.run`，每条一次 IPC 往返 | 批量 IPC / 主进程多值 INSERT | B2 |
| H | app/App.tsx:97 | 订阅整个 projects 数组，任意编辑令全树重渲染 | 细粒度选择器 + 重子树 memo | B2 |
| H | features/writing/WritingEditor.tsx:135 | `computeBookStats` 每按键跑全项目成稿管线 | 节流/空闲计算或移 Worker | B1 |
| M | repository/sqliteRepository.ts:108 | 启动 `SELECT * FROM nodes` 全表载入全部正文 | 按活动书惰性查询 | B2 |
| M | repository/sqliteRepository.ts:134 | loadAll 对每本书 `rebuild` 索引 | 仅活动书或延迟重建 | B2 |
| M | app/app-shell/Bookshelf.tsx:347 | 书库全量渲染，无虚拟化 | 虚拟列表或 content-visibility | B1 |
| M | app/stores/persistenceBridge.ts:115 | 每次落盘读 storage-config | 缓存配置低频刷新 | B1 |
| M | main/vector-ipc.ts:188 | addDocuments 逐条 insert | 批量写入 | B2 |
| M | knowledge/vectorIntegrationService.ts:34 | 构造器副作用 + bootstrap 重复 await 初始化 | 幂等守卫 | B1 |
| M | shared/services/storage.ts:99 | JSON 后端全量美化 stringify | 去缩进 + 淘汰 JSON 路径 | B2 |
| L | main/logger.ts:72 | 每条日志先 stat 查大小；启动同步探测 | 启动探测一次 + 内存计数 | B2 |
| L | main/vector-ipc.ts:94 | 语义搜索 IPC 回传完整 content | 只回传截断 snippet | B2 |

## 2. 测试、质量、UI 状态、无障碍、i18n

| 严重度 | 位置 | 问题 | 修复方向 | 批次 |
|---|---|---|---|---|
| H | app/useAppBootstrap.ts:102 | init/loadAll 失败仅记日志，空状态打开，用户以为丢书 | 弹错误并给恢复入口 | B1 |
| H | app/useBookActions.ts:123 | `exportBook` 无 catch 无反馈 | await + catch + 提示 | B1 |
| H | app/useBookActions.ts:143 | 用本地化文案判取消，英文界面把取消当失败 | 用错误码/类型判定 | B1 |
| H | features/assistant/.../SessionEventBrowser.tsx:25 | AI 事件标签硬编码中文 | 走 `t()` | B3 |
| M | shared/services/ai/gatewayClient.ts:124 | 流式只靠 done/error settle，丢事件则悬挂 | 加超时/兜底 settle | B1 |
| M | 无测试 | gatewayClient 渲染端契约零单测 | 补 Vitest | B3 |
| M | autoBackupService.ts / storageMigrations.ts | 备份滚动/迁移无单测 | 补测 | B3 |
| M | jsonRepository/ipcDriver/wasmDriver | 驱动实现无契约测试 | 抽契约测试 | B3 |
| M | e2e/a11y.spec.ts:17 | axe 只在工作台跑一次 | 各页面纳入棘轮 | B3 |
| M | e2e/extended.spec.ts | 缺导出/导入/加密/设置/损坏恢复 E2E | 补流程用例 | B3 |
| M | index.tsx:42 + ErrorBoundary.tsx:20 | 仅根节点错误边界，异常即白屏 | 区域级 boundary | B1 |
| M | features/assistant/SmartRecommender.tsx:73 | 错误与空态不可区分 | error 态 + 重试 | B3 |
| M | settings/components/PluginSettingsPanel.tsx:53 | 插件设置解析失败静默回默认 | 提示并保留原值 | B3 |
| M | main/vector-ipc.ts:184 | 向量 IPC 无入参校验 | 逐字段断言 + limit 上限 | B1 |
| M | main/vector-ipc.ts:217 | deleteItem 失败被吞 | 记日志并回报 | B1 |
| L | constants/consistencyCheck.ts:41 | 模板名/描述硬编码中文 | 纳入 i18n | B3 |
| L | credentialService.ts:23 / secureStore.ts:34 | `VAULT_REF_PREFIX` 两份实现 | 抽到 shared 单源 | B3 |
| L | scripts/check-type-escapes.mjs:18 | 棘轮只统计 `as unknown as` | 扩展口径并下调上限 | B3 |

## 3. 安全与供应链

| 严重度 | 位置 | 问题 | 修复方向 | 批次 |
|---|---|---|---|---|
| H | main/app/providers.ts:69 | readFile/writeFile/deleteFile 接受任意绝对路径 | realpath 收敛到 userData | B4 |
| H | main/sqlite-ipc.ts:118 + preload.ts:78 | 渲染层可透传任意 SQL 文本 | 主进程固化 SQL，语义化通道 | B4 |
| H | main/updater.ts:42 + release.yml:32 | 未配置 publisherName/签名校验 | 配签名与更新校验 | B4 |
| H | pluginService.ts:117 | 无 plugin.sig 即跳过签名，逻辑仍执行 | fail-closed：无有效签名不放行 | B4 |
| M | main/app/providers.ts:129 | 主进程信任键由渲染层传入，无 allowlist | 主进程内置信任键集 | B4 |
| M | credentialService.ts:43 | vault 不可用时明文回退无确认 | 显式确认并标记 | B4 |
| M | credentialService.ts:55 | 密钥解密进渲染层，与"Key 不进渲染端"矛盾 | 拉表/嵌入走主进程网关 | B5 |
| M | main/mcp/clientIpc.ts:62 | MCP connect 任意 command/args spawn | 命令白名单/审批 | B4 |
| M | package.json:27 | 无 `.npmrc`，依赖 postinstall 全量执行 | `ignore-scripts` + 按需放行 | B4 |
| M | main/app/security.ts:39 | 开发版无 CSP；connect-src 全通配 | 补开发 CSP，收敛 connect-src | B4 |
| M | main/main.ts:86 | crashReporter 无条件启动，本地转储未加密 | 默认禁上传/加密转储并告知 | B4 |
| M | main/vector-ipc.ts:184 | 向量 IPC 无校验（同 2 节） | 同 B1 | B1 |
| M | main/app/providers.ts:69 | IPC 不校验 senderFrame 来源 | 入口校验 origin | B4 |
| M | providers.ts:237 | printPdf 隐藏窗口未套安全配置 | 复用窗口安全配置 | B4 |
| L | vite.config.ts:15 | dev host 0.0.0.0 | 默认 127.0.0.1 | B4 |
| L | providers.ts:180 | exportPackage 只拦 `..`/前导 `/` | 统一路径规范化 | B4 |
| L | scripts/third-party-licenses.mjs:76 | 许可证门禁无允许清单，无 SBOM | SPDX 允许清单 + SBOM | B4 |

## 4. 数据层、发布、DX、文档

| 严重度 | 位置 | 问题 | 修复方向 | 批次 |
|---|---|---|---|---|
| H | main/sqlite-ipc.ts:50 | 自定义数据目录对数据库不生效 | DB 读取存储配置或 UI 明确禁用 | B5 |
| H | SettingsModal.tsx:367 + storage.ts:320 | `storage.migrateData` 无调用者（死代码） | 接上或删除入口 | B5 |
| H | settings/.../StorageSettingsPanel.tsx:512 | 「检查迁移」是 1 秒假实现 | 接真实检查或移除 | B1 |
| H | autoBackupService.ts:66 | 加密开启后 JSON 快照仍明文落盘 | 加密快照或明确警告跳过 | B5 |
| H | main/sqlite-ipc.ts:182 | `VACUUM INTO` 热备份只写不读，UI 不可见/不可恢复 | 面板列出并可校验/恢复 | B5 |
| H | repository/index.ts:33 | OPFS 失效静默退回 localStorage，数据不迁不提示 | 双向一次性迁移 + 哨兵 | B5 |
| H | electron-builder.yml:34 | mac 缺 zip 目标，自动更新链路不完整 | 增 `zip` target | B5 |
| M | main/app/dataDir.ts:101 | 目录迁移 cpSync 非原子，失败后永久跳过 | 临时目录校验后原子改名 | B5 |
| M | repository/schema.ts:163 | 迁移前无备份，与 25 篇承诺不一致 | 升级前落快照 | B5 |
| M | repository/__tests__/sqliteRepository.test.ts:162 | 无升级/回滚/旧库 fixture 用例 | 补迁移测试 | B3 |
| M | repository/wasmDriver.ts:112 | 网页端缺能力但 UI 仍展示相关按钮 | 按能力隐藏 | B5 |
| M | settings/.../StorageSettingsPanel.tsx:94 | 恢复覆盖整库前无安全快照、无预览 | 恢复前快照 + 预览 | B5 |
| M | main/sqlite-ipc.ts:39 | DB 热备份份数忽略 `maxBackupFiles` | 传配置或改文档 | B5 |
| M | .github/workflows/ci.yml:41 | CI 只在 ubuntu，win/mac 首次构建在打 tag | main/tag 增 win/mac 构建 | B5 |
| M | repository/sqliteRepository.ts:360 | 三后端检索最小长度不一致；JSON 后端丢弃审计 | 统一语义并标注能力差异 | B5 |
| L | package.json:1 | 无 `engines.node` | 补 `>=24` | B1 |
| L | docs/features/settings.md:44 | 备份/崩溃上报无专篇，概念分散 | 补专篇并交叉引用 | B5 |
| L | docs/features/version.md:39 | 签名/公证表述与 ci-and-release 矛盾 | 统一表述 | B5 |

## 5. AI 层与插件系统

| 严重度 | 位置 | 问题 | 修复方向 | 批次 |
|---|---|---|---|---|
| H | shared/services/ai/gatewayClient.ts:150 | 流式完成从不 recordUsage，token 漏计 | done 分支补 recordUsage | B1 |
| H | assistant/services/aiSessionManager.ts:127 | ApprovalRouter 未传 onDirectWrite，直写无审计 | 注入并强制写 Revision | B5 |
| H | core/ai/agentLoop.ts:220 | proposal 审批无 diff，写工具不落库 | 产出 exec/diff 提案后落库 | B5 |
| H | pluginService.ts:58 + core/plugin/runtime.ts:315 | 权限默认拒绝无生产调用，hook 可越权注入 | 接入 PluginContext 权限代理 | B5 |
| H | mcpClient.ts:90 | 丢弃 MCP inputSchema，执行前不校验 | 透传并校验 JSON Schema | B5 |
| M | main/net/proxy.ts:107 | 超时只覆盖到响应头，流读取无空闲超时；gemini SDK 绕过 | 流空闲超时 + SDK 传 signal | B5 |
| M | core/plugin/events.ts:85 | `EventBus.intercept` 死代码 | 接通或删除 | B5 |
| M | pluginService.ts:64 | 插件多逻辑文件按前缀 find 首个，后续被遮蔽 | fn→file 映射 | B5 |
| M | main/ai/retry.ts:90 | 错误分类粗，无鉴权/内容过滤分类 | typed 错误 + 分类文案 | B5 |
| M | repository/jsonRepository.ts:67 | JSON 后端丢 CommitOptions，审计链断裂 | 无 Revision 能力时拒绝/标注 | B5 |
| M | aiSessionManager.ts:54 | 会话 sink 整文件重写 O(n²)，明文落盘 | 追加写 + 脱敏/加密 | B5 |
| M | main/mcp/server.ts:61 | 内置 MCP server 读写打开主库，无鉴权 | readonly + 作用域 token | B5 |
| L | shared/services/ai/usageTracker.ts:21 | UsageEntry 无 feature 归因 | 增 feature 字段 | B5 |
| L | main/ai/retry.ts:63 | 重试无幂等键，可能重复计费 | 幂等键/callId 去重 | B5 |
| L | core/ai/builtinSections.ts:40 | `join('\\n')` 字面反斜杠，多策略挤一行 | 改 `join('\n')` | B1 |
| L | core/plugin/manifest.ts:78 | engine/settingsSchema 声明无消费方 | 实现或移除声明 | B5 |
| L | examples/plugins | WASM 轨无示例与端到端回归 | 补 WASM 示例 | B5 |

## 批次计划

- **B0**：性能基准与剖析脚本（度量点 + 可复现跑法），作为后续性能改动的判定依据。
- **B1**：安全的小改动（正确性/健壮性/低风险性能），一次提交。
- **B2**：保存与渲染性能重构（差分 upsert、批量 IPC、去抖、memo、惰性加载）。
- **B3**：测试与无障碍补齐（驱动契约、迁移、gateway、axe、E2E）。
- **B4**：安全与供应链硬化（文件 IPC 收敛、签名 fail-closed、CSP、`.npmrc`、SBOM）。
- **B5**：数据层与 AI/插件深度项（自定义目录、可恢复热备份、迁移备份、审批落库、权限强制）。

每批独立提交，提交前 `npm run verify`，运行时/UI 改动加跑 E2E 与打包冒烟。
