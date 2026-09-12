# 24 本地优先数据层：2026 格局与选型

本文件是 `23-data-layer-storage.md` 的续篇：按项目总根原则（`AGENTS.md` 一、试验田理念）
做一轮外部调研，收敛出适合本项目的本地优先数据层选型。

## 1. 总根原则推出的硬约束

- **只做数据模型加扩展机制**：数据层要薄，不要引入第二个重型引擎。
- **最工业化**：优先部署量最大、年限最久、生态最全的方案；新潮引擎只在明确需要时引入。
- **许可证红线**：copyleft 只抄设计不抄代码 → 依赖选宽松许可（Public Domain / MIT / Apache-2.0）。
- **AI 是增强层不是地基**：数据层在无 AI 时完整可用。
- **不留残留**：单一真相源；索引与投影必须可重建。
- **不做协作**：CRDT、多用户、实时同步、分布式不在范围内。
- **无 Rust 人力**：不接受需要自编译的原生引擎。

多模型库（SurrealDB 核心 BSL、CozoDB MPL、ArangoDB/OrientDB 服务形态）因此出局：许可不合、
或引入第二引擎、或形态与本地优先冲突。

## 2. 2026 格局扫描

### 2.1 本地优先数据框架

| 项目 | 做法 | 许可 | 与本项目 |
|---|---|---|---|
| LiveStore | 响应式嵌入 SQLite + 事件溯源（git 式同步） | 需核实 | 只借"事件为源 + 投影"设计，不引依赖 |
| sqlite-sync / SQLiteSync | SQLite + CRDT 同步 | MIT / Elastic-2.0 | 协作向，不做 |
| SQL Anywhere | SQLite 的 MIT fork（嵌入式副本 + 服务模式） | MIT | 单机用不到副本/服务 |
| Turso / libSQL | SQLite 的 Rust 重写，多库 + 嵌入式副本 + 向量 | MIT（需核实） | 分布式卖点落在不做清单 |
| monlite | `node:sqlite` 上的文档/向量/队列一栈 | MIT | 说明"SQLite 一文件可承担本地全栈" |

### 2.2 向量检索（嵌入型）

| 项目 | 算法 | 许可 | 判断 |
|---|---|---|---|
| sqlite-vec | 精确暴力 + 量化（后续 ANN） | 宽松（需核实） | 与 FTS5 同库共享 rowid，可做混合检索（RRF）；pre-v1 |
| LanceDB | IVF-PQ/HNSW，列式 Lance 格式 | **Apache-2.0** | 强在"大且多模态"，写并发靠 OCC 重试，偏对象存储 |
| usearch | HNSW | Apache-2.0（需核实） | 独立库，需自带持久化 |
| DuckDB VSS | HNSW | MIT | 查询有序列化开销、内存占用高 |

结论：单机小说量级（千级实体、万字级正文）用 **sqlite-vec（精确）或现有 vectra** 足够；
不引入 LanceDB（除非要处理大型多模态数据集）。

### 2.3 事件溯源式 AI 记忆（2026 明显趋势）

| 项目 | 机制 | 要点 |
|---|---|---|
| projectmem | 追加式明文事件日志（JSONL）+ 确定性投影摘要 + MCP | 无向量库；grep/diff/git 原生；日志即 provenance |
| memora (BPMA) | 双时态 append-only 账本 + 可重建投影 | "谁在何时知道什么"可回放；SQLite |
| engram | 事件日志（SQLite）为真相 + Markdown 导出 + Git 历史 | 三层：事件日志 / 状态投影 / 可移植导出 |
| gitmem | git 内 JSONL 事件 + 纯函数投影（brief/facts/conflicts） | 冲突显式暴露、不自动覆盖；scope 单点管控 |
| ActiveGraph | "日志即 agent"：append-only 日志 → 确定性图投影 + 内容寻址缓存 | 可重放、可廉价 fork、逐句 lineage |
| Nahuali / Provara | 事件日志 + Ed25519 哈希链（防篡改账本） | 记忆可审计、可证明未被改写 |

共同点：**追加式明文日志为唯一真相源，状态/摘要/图都是可重建的投影，重放保证确定性。**
这与 `05-ai-layer.md` 的会话事件流 + Revision 审计链思路完全一致。

### 2.4 SQLite 生产现状（2026）

- 单写者、~1TB 实用上限、NVMe 上 1–5 万写/秒、读十万级；零运维、单文件。
- 备份/复制用 Litestream（WAL 增量到对象存储）或嵌入式副本。
- 共识：本地优先/边缘/单机的首选，但要预置迁移预案。

## 3. 收敛出的三种模式

1. **引擎即真相（SQLite-only）**：简单、ACID；不可 diff、历史弱。
2. **日志为真相（event sourcing）**：可重放/审计/时间旅行；需投影与压实。
3. **文件为真相 + 索引缓存**：可读可 git；结构化查询弱、需一致性校验（`23` 的结论）。

本项目实际是**三者按数据类组合**：长文文件、结构化实体库、历史日志。

## 4. 对本项目的推荐

```
正文（章节/场景）        → 文件为源（每章一文件）            [23]
结构化状态（卡片/关系）   → SQLite 为状态（可重建投影）        [本节]
历史与审计              → append-only JSONL 事件日志（唯一真相）[本节]
检索（FTS/向量/图谱）     → 可重建索引（FTS5 / sqlite-vec / 现有 vectra）
```

关键取舍：

- **单一引擎**：只用 SQLite（Public Domain）+ 宽松许可扩展（FTS5 内建、sqlite-vec 可选）；
  不引入第二个数据库引擎。
- **状态是投影**：SQLite 中的实体状态由事件日志确定性折叠而来，日志不可改写、只追加；
  删除用"补偿事件"，不物理删除。这与 `05` 的 Revision/entity_changes 重合。
- **可重建**：删掉 SQLite 与索引，能从 JSONL 日志 + 正文文件重建等价状态；
  投影重建是纯函数且幂等（对齐 projectmem/engram/gitmem/ActiveGraph 的做法）。
- **不引入**：CRDT/协作同步、分布式、多模型引擎、服务型数据库、需自编译的原生引擎。
- **许可**：新增依赖必须 Public Domain / MIT / Apache-2.0；copyleft 只借设计。

## 5. 分期与验收

| 阶段 | 内容 | 验收 |
|---|---|---|
| D1 | 统一事件日志（append-only JSONL）+ 现有 SQLite 状态改为其投影 | 删库后由日志重建，状态一致 |
| D2 | 混合检索（FTS5 + 可选 sqlite-vec，RRF 融合） | 与现有检索结果等价或更优 |
| D3 | 正文文件为源（章节文件 + 清单校验） | 外部改单章可导入；diff 只涉及该章 |

D1 验收细则：同一操作序列折叠出的状态可复现；日志只追加；非法/损坏尾行可安全截断或隔离；
投影重建幂等（重建两次字节一致）。

## 6. 来源

- LiveStore：https://livestore.dev/
- SQL Anywhere（SQLite MIT fork）：https://github.com/kwhorne/sql-anywhere
- monlite（SQLite 一文件全栈）：https://github.com/qataruts/monlite
- Turso / libSQL：https://turso.tech/
- SQLite 生产现状（2026）：https://sesamedisk.com/sqlite-in-production-2026/
- sqlite-vec：https://github.com/asg017/sqlite-vec
- LanceDB：https://github.com/lancedb/lancedb
- projectmem（事件溯源 AI 记忆，论文）：https://arxiv.org/html/2606.12329v1
- memora / BPMA：https://github.com/Nifty0x/memora
- engram（事件日志 + Markdown + Git）：https://github.com/DINGUSPUNGUS/Engram
- gitmem（git 内 JSONL 事件 + 投影）：https://github.com/josephy02/gitmem
- ActiveGraph（"日志即 agent"）：https://www.alphaxiv.org/abs/2605.21997
- Provara（可防篡改事件日志）：https://github.com/provara-protocol/provara
