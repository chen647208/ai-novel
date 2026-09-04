# 03 数据层设计：六实体、类型注册表、DSL 与索引

> 依据：research/01（novelWriter 标签/Build）、03（Trilium 六实体/entity_changes/BAttribute 源码细节）、05（Manuskript 字段清单）。落点：扩展现有 `repository/` 抽象，schema v1 → v2。

## 1. 六实体（`src/core/entities/`）

```ts
/** 内容单元：章节/场景/人物卡/地点/伏笔/叙事线……一切皆 Node */
interface Node {
  id: string;              // UUIDv7（时间有序，利于索引）
  type: string;            // 类型模板 id（见 §2），'novel.chapter' | 'card.character' …
  title: string;
  bookId: string;
  body: string;            // DSL 文本（§3），二进制内容存 Blob 引用
  attrs: Attribute[];      // 内联声明的元数据（序列化时展开进 frontmatter）
  createdAt: number;
  updatedAt: number;
  /** 同步哈希字段声明——实体类自描述（Trilium hashedProperties 模式） */
}

/** 边：多父结构 + 关系。硬链接与软引用统一为 Edge，kind 区分 */
interface Edge {
  id: string;
  fromId: string; toId: string;
  kind: 'contain' | 'link-hard' | 'ref-soft';   // 树父子 / 正文硬链接 / @tag 软引用
  role?: string;           // 'pov' | 'character' | 'location' | 'plot' | 'foreshadow' …
  position: number;        // 同级排序（取代 chapters[] 数组序）
  bookId: string;
}

/** 属性：label（值）与 relation（带目标的边属性） */
interface Attribute {
  id: string; nodeId: string;
  type: 'label' | 'relation';
  name: string;            // 'status' | 'importance' | 'motivation' | 'pov' …
  value: string;           // relation 的 value = 目标 nodeId；label 支持 "显示名|描述" 串（Trilium promoted 模式）
  inheritable: boolean;
  position: number;
}

/** 版本：每次变更自动留底（取代 chapterSnapshotService 的手动语义） */
interface Revision {
  id: string; nodeId: string;
  seq: number;             // 单调递增
  body: string;            // 全量快照（MVP），delta 压缩后置优化
  author: 'user' | string; // 'user' 或 agentId（'ai:outline-gen'）——AI 审计免费获得
  cause?: string;          // 触发本次变更的 toolCallId/commandId
  createdAt: number;
}

/** 附件与二进制 */
interface Attachment { id: string; nodeId: string; role: string; mime: string; blobId: string; }
interface Blob { id: string; bytes: Uint8Array; enc?: 'aes-128-cbc'; }  // 逐条加密预留（Trilium 模式）

/** 变更日志：同步/审计/撤销的统一地基（03 篇 Trilium 协议） */
interface EntityChange {
  id: number;              // 自增
  entityName: 'nodes'|'edges'|'attrs'|'revisions'|'attachments'|'blobs';
  entityId: string;
  hash: string;            // SHA-256，字段集由实体 hashedProperties 声明
  isErased: boolean;
  instanceId: string;      // 进程级（启动生成）
  agentId: string;         // 'user' | 'ai:<tool>' | 'import' —— 我们比 Trilium 多这一列
  utcDateChanged: number;
}
```

**不变量**（写进 core 单测）：
1. 一切写操作必须产生 EntityChange（编译期：Store 只暴露 `apply(changes)`）。
2. 乱序写入用骨架实体（引用到不存在的 nodeId 时建占位，后到填充——Trilium battribute.init 模式）。
3. 删除 = `isErased` 软删 + Archive 语义（novelWriter：归档内容退出索引但保留）。

## 2. 类型注册表（`src/core/types-registry/`）

```ts
interface TypeTemplate {
  id: string;                       // 'card.character'
  label: string; labelEn?: string;
  icon: string; category: 'novel' | 'card' | 'meta';
  tagKind?: 'character'|'location'|'plot'|'object'|'entity'|'custom';  // novelWriter Root 语义
  fields: FieldDef[];               // Manuskript 模板驱动字段
  views: ('outline'|'corkboard'|'table'|'graph'|'sheet')[];
  statusLabels?: 'status' | 'importance';   // novelWriter 双标签体系按类别绑定
  dslHint?: { headingLevel: 1|2|3 };
}
interface FieldDef {
  key: string; label: string;
  type: 'text'|'number'|'date'|'list'|'ref'|'image'|'richtext'|'enum';
  enum?: string[]; refType?: string;  // ref = 软引用（生成 @tag 关键字）
  required?: boolean; group?: string; // group 支撑卡片分区
}
```

**内置模板首批**（从现有 types.ts 领域类型直接转写，01 篇 §7 的"实例化"）：

| 模板 id | 来源现状 | 关键字段（Manuskript 实测清单对齐） |
|---|---|---|
| `novel.book` | Project | title/inspiration/intro/synopsis |
| `novel.part` `novel.chapter` `novel.scene` | chapters[] + virtualChapters[] | POV/status/labels[]/synopsis/wordGoal/setGoal/compile |
| `card.character` | Character | **motivation/goal/conflict/epiphany**（弧线四件套）+ importance/alias/pov/summary 三级 |
| `card.location` | Location | passion/conflict（World 实测字段）+ region |
| `card.faction` | Faction | 现有字段保留 |
| `card.item` | （新） | 易手道具（novelWriter Objects） |
| `card.entity` | （新） | 组织/势力上位概念 |
| `world.magic-system` `world.tech-level` `world.history` | MagicSystem/TechnologyLevel/WorldHistory | 转写 |
| `world.rule-system` | RuleSystem | 转写 |
| `meta.timeline` `meta.timeline-event` | Timeline/TimelineEvent | 日期历法（HistoryDate）转写 |
| `meta.foreshadow` | Foreshadow | status(planted/paid-off/abandoned)×importance 并入双标签体系 |
| `meta.strand` | （新） | 叙事线（bibisco 概念）：场景多对多挂线 |
| `meta.knowledge` | KnowledgeItem | category 并入 category 模板 |
| `meta.prompt-card` | PromptTemplate/CardPromptTemplate | 设置类，不进索引 |

**插件可注册新模板**（04 篇贡献点 #1）——这是"各类型数据通用"的落点：新数据 = 新模板，零 schema 迁移。

## 3. 开放文本 DSL（`src/core/dsl/`）——小说版 Fountain

设计原则（Fountain 实测规范）：空行分块、启发式识别 + 强制前缀兜底、人人可读、Git 可 diff。

一本书的目录布局（纯文本为源，公理 1）：

```
books/<bookId>/
├── book.novel.md              # frontmatter: title/inspiration/intro
├── novel/
│   ├── 01-第一幕.part.md       #   结构节点：标题即层级（# / ## / ###）
│   │   └── ch001-第一章.md
│   │       # %%% 语法块（novelWriter 关键字，前缀改 @ 与代码注释区分）
│   │       # @pov: 林渊, 苏雪
│   │       # @strand: 主线A
│   │       # @foreshadow-ref: FS-012
│   ├── ch002.md
├── cards/
│   ├── character-林渊.md       # frontmatter: type: card.character, status: main
│   │   @tag: 林渊 | 林师兄      # 标签声明（全库唯一）
│   ├── location-云都.md
├── meta/
│   ├── timeline.md  strands.md  foreshadows.md
└── .novel/                     # 生成物，Git ignore
    ├── index.json              # 索引缓存（revision 号失效判断）
    └── changes.db              # entity_changes + revisions（SQLite，可删可重建）
```

- 每个文件 = 一个 Node：YAML frontmatter（type/title/attrs/status）+ 正文。
- `@tag:` 声明、`@pov/@character/@location/@plot/@strand:` 引用——**语法直接采用 novelWriter 关键字表**（01 篇），编辑器实时校验高亮（CM6，06 篇）。
- 硬链接（章节间跳转）用 `[[目标标签]]` wiki-link 语法（kind=link-hard，改名联动）；软引用不联动（Twine 二分，04 篇）。
- **序列化器双向**：`parse(text) → Node+Attrs` / `serialize(node) → text`，往返测试是 M0 硬验收。
- 现状映射：`chapters[].content → novel/*.md 正文`；`virtualChapters → Edge(contain, role=virtual)`；`knowledge[] → cards/*.md`。

## 4. 索引器（`src/core/index/`）

```ts
interface RefIndex {
  tags: Map<string, TagEntry>;                    // tag → {nodeId, displayName, kind}
  refs: Map<string, RefEntry[]>;                  // tag → 引用它的 [{nodeId, role, headingId}]
  hardLinks: Map<string, string[]>;               // nodeId → 出链
  wordCounts: Map<string, WordBucket>;            // 按标题层级分桶（novelWriter _indexWordCounts）
  strandProgress: Map<string, StrandStat>;        // 叙事线：每线场景数/字数/最后推进
  foreshadowOpen: ForeshadowStat[];               // 伏笔：planted 未回收 + 超期
}
interface IndexService {
  rebuild(bookId): Promise<IndexSnapshot>;        // 全量（进度事件上报，boot 守卫用）
  reindexFile(bookId, path): Promise<void>;       // 增量（novelWriter reIndexHandle 模式）
  snapshot(): IndexSnapshot;                      // 只读消费入口（一致性/伏笔/图谱/Build 全走这里）
}
```

- 索引持久化 `.novel/index.json` + `indexRevision`（格式版本 + 文件 mtime 失效判断，01 篇实测）。
- **一致性检查与伏笔追踪改为纯索引消费者**：删除 worldConsistencyService(544 行)/foreshadowService 里的自遍历——它们变成索引上的查询函数。
- 向量索引（合并后的 VectorIndex）挂在同一变更流上：Node 变更 → 增量嵌入（现状 7 个向量服务收敛为 1，01 篇 §6）。

## 5. schema v2（SQLite 侧，`repository/schema.ts` 扩展）

```sql
-- v1 保留只读兼容一个版本周期；v2 新表：
CREATE TABLE nodes(id TEXT PRIMARY KEY, book_id TEXT, type TEXT, title TEXT,
                   body TEXT, path TEXT, updated_at INTEGER, erased INTEGER DEFAULT 0);
CREATE TABLE edges(id TEXT PRIMARY KEY, from_id TEXT, to_id TEXT, kind TEXT,
                   role TEXT, position REAL, book_id TEXT, erased INTEGER DEFAULT 0);
CREATE TABLE attrs(id TEXT PRIMARY KEY, node_id TEXT, type TEXT, name TEXT,
                   value TEXT, inheritable INTEGER, position INTEGER, erased INTEGER DEFAULT 0);
CREATE TABLE revisions(id TEXT PRIMARY KEY, node_id TEXT, seq INTEGER,
                       body TEXT, author TEXT, cause TEXT, created_at INTEGER);
CREATE TABLE entity_changes(id INTEGER PRIMARY KEY AUTOINCREMENT, entity_name TEXT,
  entity_id TEXT, hash TEXT, is_erased INTEGER, instance_id TEXT, agent_id TEXT,
  utc_date_changed INTEGER);
CREATE TABLE blobs(id TEXT PRIMARY KEY, bytes BLOB, enc TEXT);
-- 纯文本文件是事实来源时，nodes.body 是文件的缓存投影：mtime 不符即重读
-- FTS5 三张表沿用 trigram 方案，改为投影 nodes/knowledge
```

- **文件为源、DB 为投影**：桌面模式写文件 + 同事务写 DB 投影与 entity_changes；浏览器无文件系统 → DB 为主存 + DSL 序列化导出兜底（现有三后端选择逻辑天然支持）。
- 乱序/骨架实体：外键不建硬约束（SQLite 侧软校验），索引器负责完整性报告（03 篇 Trilium 模式）。

## 6. 迁移框架（一次性，M0）

```
migrations/v2-import.ts:
  1. 读旧源（repository.loadAll()：JSON 或 schema v1 文档行）
  2. 规范化：字段映射表（§3 末）+ 缺失字段补默认（对齐 Manuskript 清单）
  3. 写新格式：books/<id>/*.md + DB v2 + entity_changes(agentId='import')
  4. 校验：往返 diff（旧 JSON vs 新模型序列化）+ 索引一致性报告
  5. 旧数据改名 .legacy 保留（用户规则：不做双写兼容）
  6. 失败：AutoBackupService 快照回滚，明确报错不静默
```

验收：28 个现有测试全绿 + 新增往返测试/迁移测试/索引增量测试；`npm run verify` 通过。
