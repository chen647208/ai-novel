# 25 数据安全：威胁模型与防护分层

本文件回答一个问题：用户的小说数据在全生命周期里可能怎么丢、怎么坏、怎么被看，项目用哪些机制挡住，
每条机制的验收标准是什么。它是 `23-data-layer-storage.md` 与 `24-local-first-data-layer.md` 的落地篇：
23/24 决定"数据放哪、谁是真相"，本篇决定"真相怎么不丢"。

## 1. 硬约束（来自 AGENTS.md 一、试验田理念）

- **单一引擎**：只用 SQLite 一系，不引入第二个数据库。
- **宽松许可**：依赖必须 Public Domain / MIT / Apache-2.0；copyleft 只借设计。
- **可重建**：正文以文件为源，结构化状态与索引都是可重建投影；删库可从源头重建。
- **AI 是增强层不是地基**：数据安全机制不得依赖 AI 或网络。
- **最工业化**：优先部署量最大、年限最久、生态最全的实现。
- **不留残留**：机制一旦被更好方案替代，调用方同步切换，不留双路径。

## 2. 威胁模型

按"数据在什么状态被什么打断"分类，不按攻击者画像分类：

| 编号 | 威胁 | 典型原因 | 主要防线 |
|---|---|---|---|
| T1 | 进程被杀 / 崩溃 | 用户结束任务、OOM、驱动崩溃 | 事务 + WAL，未提交不落盘 |
| T2 | 断电 / 强制关机 | 掉电、长按电源 | `synchronous=FULL`（每次提交 fsync） |
| T3 | 磁盘满 / 只读 | 空间耗尽、外置盘拔出 | 写失败退避重试 + 明确报错，不静默丢 |
| T4 | 文件级损坏 | fsync 说谎的存储、断链、内存故障 | `cell_size_check` + 启动 `quick_check` + 深度 `integrity_check` |
| T5 | 位腐 / 静默篡改 | 介质老化、被外部改写 | 备份多代 + 校验和 + 定期抽查 |
| T6 | 误删 / 误覆盖 | 用户误操作、导入覆盖 | 恢复出厂前的确认、备份可回滚、导入前快照 |
| T7 | 迁移失败 | schema 升级中途出错 | 迁移前自动备份 + 单事务 + 失败回滚 |
| T8 | 备份自身损坏 | 备份时正写入、裸拷贝活库 | 用 `VACUUM INTO` / backup API，不复制 `-wal`/`-shm` |
| T9 | 设备丢失 / 被拷 | 笔记本丢失、共享目录 | 磁盘加密（OS）+ 可选库级加密 + 密钥走系统钥匙串 |
| T10 | 多连接争用 | 主进程与 MCP 子进程同开一个库 | `busy_timeout` + 引擎修复版 + 单写者纪律 |
| T11 | 供应链 / 版本缺陷 | 引擎版本含已知缺陷 | 依赖锁版本 + 选用已修复版本 + 版本可见 |

## 3. 事实依据（2026）

### 3.1 SQLite 损坏成因

SQLite 官方《How To Corrupt An SQLite Database File》列出的可控成因，与本项目相关的有：

- `PRAGMA synchronous=OFF`：断电时可能写坏，禁用。
- 破损的 POSIX 文件锁（`close()` 会取消该进程持有的全部锁）：单进程内多连接时危险。
- **WAL-reset 缺陷**：3.7.0 到 3.51.2 之间的版本，在 WAL 模式下有至少两个连接且发生并发 checkpoint 时，
  可能损坏数据库。修复在 **3.44.6 / 3.50.7 / 3.51.3** 三条线。本项目主进程与独立 MCP server 会同时打开
  `hongyue.db`，属于"多连接"，因此这不是理论风险。
- 过期的表达式索引（表达式语义随环境变化）：保持 schema 简单可规避。
- fsync 说谎的存储、网络文件系统、直接复制正在使用的库文件：都不受应用控制，只能靠备份兜底。

### 3.2 WAL 的耐久语义

- `synchronous=FULL`：每次提交都把 WAL 刷到盘，断电不丢已提交事务。
- `synchronous=NORMAL`：应用崩溃安全，但断电可能丢最近若干次提交（库不损坏）。
- 本项目写入量小（单用户写作），选 **FULL**，用可忽略的写放大换"断电不丢字"。

### 3.3 备份与恢复

- `VACUUM INTO`：产出一致的单文件副本，包含 WAL 中尚未 checkpoint 的数据，是活库热备份的正确做法。
- SQLite backup API：同样是热备份，支持增量步骤；`VACUUM INTO` 更简单。
- Litestream：后台进程持续把 WAL 增量发到对象存储，支持时间点恢复；它证明"持续备份 + 定期恢复演练"可行，
  但引入常驻进程与远端，本项目先做本地多代 + 手动导出。
- 复制活库文件时必须同时复制 `-wal` 与 `-shm`，否则备份可能不一致；这是 T8 的根源。

### 3.4 加密

- OS 磁盘加密（BitLocker / FileVault / LUKS）：覆盖"设备丢失"，零应用改动，作为基线。
- Electron `safeStorage`：密钥交给系统钥匙串（macOS Keychain / Windows DPAPI / Linux libsecret），
  本项目已用于 API Key 与凭据。
- SQLCipher / wxSQLite3（`better-sqlite3-multiple-ciphers`，均宽松许可）：库级 AES-256 加密，
  密钥由 `safeStorage` 包裹。属候选，未启用。

### 3.5 行业案例

Tailscale 把"完整性验证"做成流水线阶段：定期取备份、在隔离环境恢复、校验通过才保留，失败即告警。
要点是**备份不算数，能恢复才算数**，与本篇 §5 的验收一致。

## 4. 引擎决策：主进程改用 better-sqlite3-multiple-ciphers

### 4.1 问题

运行时内置的 SQLite（`node:sqlite`）版本由 Electron/Node 决定，为 **3.50.4**，
落在 WAL-reset 缺陷区间（< 3.51.3），且独立 MCP server 会与之并发开库（T10）。

### 4.2 候选

| 方案 | 版本来源 | 许可 | 预编译 | 判断 |
|---|---|---|---|---|
| 留在 `node:sqlite` | 随 Electron/Node | Public Domain | 无需 | 版本不可控，缺陷不可修 |
| **better-sqlite3-multiple-ciphers 13** | 随包发布 | **MIT** | **N-API，跨 Node/Electron** | **采用** |
| `sqlite3`（node-sqlite3） | 随包发布 | BSD-3 | 需按 ABI 预编译 | 异步 API，改动大 |
| `@sqlite.org/sqlite-wasm` | 随包发布 | Public Domain | WASM | 无本地文件 VFS，性能不及原生 |

### 4.3 实测结论（本机与 CI 目标环境）

- 加密分支 **13.0.3**（与上游 better-sqlite3 同版本）内嵌 **SQLite 3.53.4**，已含 WAL-reset 修复。
- 走 **N-API**：同一份预编译二进制跨 Node 版本与 Electron 版本可用，实测在 **Electron 44.0.0 / Node 24.18.1**
  下零重编译加载，建库、WAL、读写、bigint、Blob、数组绑定均正常。
- 预编译覆盖 win32/darwin/linux（含 musl）× x64/arm64；安装不触发 node-gyp。
- Linux 预编译依赖的最高 glibc 符号为 **2.34**，ubuntu-latest（24.04，glibc 2.39）兼容。
- API 与 `node:sqlite` 同形（`prepare().run/get/all`、`exec`、`close`），迁移为机械替换；
  额外提供 SQLCipher 兼容的 `PRAGMA key` / `PRAGMA rekey`。
- 启动开销：安装即带预编译，无编译步骤。

结论：符合"默认全上最新、除明确不兼容"的原则，是修掉 T10 根因与启用 L3 的同一条低改动路径。

### 4.4 加密启用流程

库默认明文。启用加密时（`sqlite-ipc.ts`）：

1. 生成 32 字节随机主密钥，用 `safeStorage` 包裹后写 `userData/db-encryption.json`。
2. 明文库先切出 WAL（`journal_mode = DELETE`）再 `PRAGMA rekey='…'`，最后回到 WAL；
   失败即删除刚写入的密钥文件，避免"密钥在、库未加密"的错配。
3. 停用加密是逆过程（`rekey=''` 后删密钥文件）。

恢复码即主密钥的 64 位十六进制串，可在设置内导出；换机或钥匙串损坏时，先校验恢复码能打开数据库
（`validateRecoveryKey`），再重建密钥文件并重开连接。钥匙串不可用时一律显式失败，不静默降级。

## 5. 防护分层与验收

| 层 | 机制 | 现状 | 验收 |
|---|---|---|---|
| L0 写入 | WAL + `synchronous=FULL` + `busy_timeout=5000` + `wal_autocheckpoint=1000` + `foreign_keys=ON` | 实现 | 断电注入后库可打开且已提交事务在 |
| L1 完整性 | `cell_size_check=ON`；启动 `quick_check`；手动深度 `integrity_check` | 实现 | 损坏库在启动即提示，不继续覆盖写 |
| L2 备份 | 自动 JSON 快照（可配间隔/份数；启用库级加密时快照落 AES-256-GCM 密文）+ `VACUUM INTO` 数据库热备份（滚动保留） | 实现 | 备份文件可被 SQLite 直接打开；份数按配置滚动 |
| L3 加密 | 库级 AES-256（SQLCipher 兼容）；密钥经 `safeStorage` 包裹，可导出恢复码 | 实现 | 无密钥不可读；钥匙串不可用时明确失败 |
| L4 恢复 | 启动检测损坏 → 从备份恢复 → 重建投影；导出可移植 | 部分 | 从最近备份恢复后状态与备份一致 |
| L5 验证 | 真实加密引擎的"备份→打开→校验"与篡改检出用例 | 实现 | CI 内含 `dbSafety` 演练 |
| L6 供应链 | 依赖锁版本、版本可见、许可证门禁 | 实现 | `verify` 全绿；第三方清单含引擎与许可 |

## 6. 分期

| 阶段 | 内容 | 验收 |
|---|---|---|
| S1 | 引擎迁移到 better-sqlite3-multiple-ciphers + L0/L1 加固 | 现有测试与 E2E 全绿；SQLite 版本 ≥ 3.51.3 |
| S2 | L2 数据库热备份接入自动备份流程 | 备份文件可被 SQLite 打开并含最新提交 |
| S3 | L5 恢复演练与篡改检出用例 | `dbSafety` 演练：副本可恢复、篡改可检出 |
| S4 | L3 库级加密（safeStorage 保管密钥 + 恢复码） | 无密钥不可读；钥匙串不可用时明确失败 |
| S5 | L4 恢复向导入导出体验（选择备份、预览、回滚） | 用户可在设置内完成恢复 |

## 7. 来源

- SQLite 损坏成因：https://www.sqlite.org/howtocorrupt.html
- WAL-reset 缺陷说明：https://sqlite.org/wal.html#walresetbug
- `VACUUM INTO`：https://www.sqlite.org/lang_vacuum.html
- SQLite backup API：https://www.sqlite.org/backup.html
- Litestream（持续备份/时间点恢复）：https://litestream.io/how-it-works/
- Electron `safeStorage`：https://www.electronjs.org/docs/latest/api/safe-storage
- better-sqlite3：https://github.com/WiseLibs/better-sqlite3
- better-sqlite3-multiple-ciphers：https://github.com/m4heshd/better-sqlite3-multiple-ciphers
- Tailscale 备份完整性流水线：https://tailscale.com/blog/backups
