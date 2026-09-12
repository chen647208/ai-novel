# 23 数据层存储选型：文件、数据库与日志的边界

本文件回应一个质疑：**"文件为真相源"的先例不等于优解，其缺点明显。**
做法是先承认缺点，再逐项目看真实机制，最后给出按数据种类分层的设计。
本文件是 `03-data-layer.md`（v2 数据层蓝图）的选型前置分析。

## 1. 先承认：文件为源的缺点

- **元数据无处安放**：frontmatter 或 sidecar 二选一都不干净；改一行元数据要重写整个文件，diff 噪音大。
- **顺序与结构不在文件系统里**：段落/章节次序、分组靠额外清单（manifest），清单与文件可能不一致。
- **小文件海**：每实体一文件时，Windows/NTFS 与杀毒软件扫描成本高。
- **没有跨文件事务与引用完整性**：改名/移动/级联删除需应用层补原子性与回滚。
- **查询弱**：关联、图谱、聚合查询要自建索引；索引与源不一致时还要重建逻辑。
- **二进制资源**：图片/音频需独立 blob 方案，不能塞进文本文件。
- **同步/合并难**：文件级同步易冲突；无 CRDT 时"后写覆盖"。
- **双写者风险**：应用与 git/网盘同时改同一文件时靠 checksum/冲突副本兜底。

## 2. 其他项目的真实机制（实测）

| 项目 | 真相源 | 结构与元数据 | 索引 | 历史/快照 |
|---|---|---|---|---|
| Scrivener 3 | `Files/Data/<UUID>/content.rtf`（每文档一文件） | `.scrivx` XML 清单（binder 树 + 元数据） | `search.indexes` 二进制 | `Snapshots/`；`docs.checksum` 记录每文档 SHA-1 |
| novelWriter | `content/<handle>.nwd`（每文档一文件，纯文本） | `nwProject.nwx` XML（项目结构与元数据） | `meta/index.json`（**可完全重建**） | `meta/sessions.jsonl` 追加式写作统计 |
| Ulysses | 隐藏 library bundle：`.ulysses` 内含 `Content.xml` + `Text.txt` | 同 bundle | 库内 | 系统 Versions + 自动备份；外部文件夹可退化为 Markdown |
| Logseq | SQLite（WASM/OPFS）持久层 | SQLite + Malli schema | DataScript（内存 Datalog）+ SQLite FTS + 客户端操作日志 | 操作日志用于离线同步 |
| bibisco | v2 起项目库是**单个 JSON 文件**（可文本阅读），启动自动备份（v1 为真数据库，以损坏风险为动机改 JSON） |
| Zettlr | 用户自己的 Markdown 文件（"笔记留你放的地方"） | 应用外用 Pandoc 配置 | 应用内导航/图谱 |
| Manuskript | 自动保存为**开放纯文本**格式 |

观察：**没有一个是"纯文件或纯数据库"的极端**。Scrivener/novelWriter 是"每文档文件 + 一个 XML 清单 + 可重建索引"；Ulysses/bibisco 是"单包/单 JSON"；Logseq 是"SQLite 持久 + 内存图索引"。选型真正在选的是**真相源粒度**与**索引形态**。

## 3. 三种极端与代价

- **纯单库（Ulysses/bibisco 早期）**：ACID、查询强；但不可 diff、进不了 git、损坏即全灭（bibisco 因此回退 JSON）。
- **纯文件（每实体一文件）**：可读、可 diff、可救；但查询/事务/结构弱，需自建清单与索引。
- **纯内存图库 + 落盘（Logseq）**：查询最强；但持久层与内存层一致性、启动重建成本高。

## 4. 推荐设计：按数据种类分层，而非二选一

| 数据类 | 真相源 | 理由 |
|---|---|---|
| 长文正文（章节/场景） | **文件**（Markdown/DSL，每章一文件） | 大文本、要 diff/git/快照/外部编辑器；改一章只动一文件 |
| 结构实体（卡片/类型/关系/图谱边） | **SQLite** | 关联、聚合、引用完整性、事务；数据量小但查询多 |
| 历史与审计（AI 会话、entity_changes、Revision） | **追加式日志（JSONL）** | 只增不改、可回放、AI patch 溯源；与 Scrivener 快照同思路 |
| 二进制资源（图片/音频） | **内容寻址 blob 目录** | 不塞文本；按哈希去重与校验 |
| 全文检索 / 向量 / 图谱视图 | **可重建索引（SQLite FTS / vectra）** | 派生数据，删除可重建，不入真相源 |

配套约束（把第 1 节的缺点逐条钉住）：

1. **清单与内容一致性**：章节清单（`index.json` 或 DB 行）记 `{id, order, file, checksum}`；启动与保存后校验，缺失/多余即修复。
2. **原子写**：所有文件写走"临时文件 + rename"；单写者 + 写队列，避免双写者。
3. **元数据分层**：正文文件只放写作正文（+最小 frontmatter：id/title/order）；状态/标签/关系等放 DB，避免改元数据重写正文。
4. **改名用稳定 id**：文件名用 UUID/短 id（学 Scrivener/novelWriter），改名只改清单，不动文件名。
5. **级联与事务**：DB 内的关系用外键/事务；跨文件动作（删章）走"日志先行 + 幂等执行"。
6. **可迁移**：DB 可导出为逐实体 JSON/文本；文件可反向导入 DB；任一方向可重建。
7. **备份与自检**：定期整包 zip 备份（novelWriter 式）+ DB `PRAGMA integrity_check` + 索引重建。

## 5. 与当前实现的关系

当前应用已具备大多数地基：SQLite（entities/attrs/nodes）为持久层、JSON 仓储为回退、`storageMigrations` 做结构迁移、自动备份与完整性检查、AI 会话 JSONL、FTS 与向量索引。缺口集中在**"正文以文件为源、DB 为结构源"的分层尚未落地**——这正是本文与 `03-data-layer.md` 的分工点。

## 6. 验收标准

1. 断电/强杀后重启：正文文件与 DB 均无丢失，索引可自动重建（清单校验通过）。
2. 单章正文可用外部编辑器改后由应用导入，且 diff 只涉及该章文件。
3. 删章/改元数据不触碰其它章文件；改名不改文件名（稳定 id）。
4. DB 可整体导出为逐实体可读文件，再从导出重建出等价 DB。
5. 索引（FTS/向量）删除后可从真相源重建，结果一致。

## 7. 来源

- Scrivener 格式实测：https://github.com/writerslogic/scrivener-mcp/blob/main/docs/scrivener-format.md
- novelWriter 存储：https://novelwriter.io/docs/technical/storage.html
- Ulysses 库与外部文件夹：https://help.ulysses.app/the-library/external-folders
- Logseq 数据与持久化：https://deepwiki.com/logseq/logseq/4-data-and-persistence
- bibisco v2 项目库改 JSON（可读、自动备份）：https://lordofthings.wordpress.com/2018/06/16/bibisco/
- Zettlr（文件留在用户处）：https://www.zettlr.com/
