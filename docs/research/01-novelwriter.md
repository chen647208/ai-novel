# novelWriter 调研：小说写作的数据模型与 Build 系统

> 调研日期：2026-08-31 ｜ 仓库：https://github.com/saga-soft/novelWriter ｜ 3.1k★ ｜ Python + Qt6 ｜ 活跃（最近推送 2026-08-30）
> 定位：纯文本小说写作工具，"用多个小文本文件组织长篇小说"。非 AI，纯写作。

## 1. 为什么值得深挖

novelWriter 是同类项目中**信息架构最干净**的一个。它的设计哲学一句话概括：

> **没有表单，没有表格，没有数据库。一切元数据都是写在正文里的关键字，由索引器扫描提取。**

这和我们当前项目（SQLite/JSON 存卡片、表单驱动的人物卡/世界观卡）是两条路线。它的很多机制能直接回答我们"通用小说创作工具"的数据建模问题。

## 2. 核心机制拆解

### 2.1 Root Folder 类型系统（项目结构即语义）

项目顶层是若干"根文件夹"，**文件夹类型决定其内文档的语义类别**：

| 类型 | 用途 | 对应我们的 feature |
|---|---|---|
| Novel | 正文（章节/场景/分节） | chapters / writing |
| Plot | 情节线索笔记 | outline / foreshadowing |
| Characters | 人物卡 | characters |
| Locations | 地点设定 | world |
| Timeline | 时间线 | timeline |
| Objects | 重要道具（会易手的物件） | world / foreshadowing |
| Entities | 组织/势力 | world |
| Custom | 自定义类别（兜底） | knowledge / cards |
| Templates | 新建文档模板库 | （我们没有） |
| Archive | 归档，被索引器完全忽略 | version（部分） |
| Trash | 回收站 | （我们没有） |

关键设计点：
- **类型只约束"引用语义"，不约束内容**。除 Novel 外，官方明说"你想放什么就放什么"。类型的作用是让标签自动归入正确的类别索引。
- **支持多个 Novel 根文件夹**（一个项目多本小说/多卷的雏形）。
- 根文件夹可任意重命名。

### 2.2 标签与引用系统（全文本元数据，无表单）

这是它最独特的机制。元数据附着在**标题（heading）**上而非文档上，用正文关键字声明：

```markdown
# Character: Jane Doe

@tag: Jane | Jane Doe

关于简的一些信息。
```

- `@tag: 唯一名 | 显示名`：声明一个标签。唯一名用于引用，显示名用于导出时排版（比如把 POV 人物名插进章节标题）。
- 引用侧：`@pov: Jane, Bob`、`@character: ...`、`@location: ...`、`@plot: ...`、`@note: ...` 等关键字 + 逗号分隔值列表，写在 Novel 文档的标题下方。
- **标签全项目唯一**，一个标题只能一个标签；编辑器实时校验（合法高亮、非法画波浪线）——把"外键完整性"做进了编辑器着色层。
- 索引器（`core/index.py`）扫描全项目，构建 tag→heading 映射、引用计数、字数统计。引用面板实时显示"这个人物卡被哪些场景引用了"。

**对我们的启示**：一致性检查（consistency）和伏笔追踪（foreshadowing）最缺的就是"引用关系"这一等公民。novelWriter 证明引用关系可以从纯文本中提取，不需要结构化表单——这对"通用、什么数据都敢塞"的方向极其关键：**新数据类型不需要新表新表单，只需要一个新的引用关键字**。

### 2.3 Status / Importance 双标签体系

- Novel 文件夹内的文档用 **Status**（草稿/完成……）；笔记类文档用 **Importance**（主要/次要……）。
- 标签集合由用户在项目设置里自定义（名称+图标+颜色），**程序本身不使用这些值做任何逻辑**——纯用户语义。
- 另有 Active/Inactive 开关：Inactive = 整篇"临时撤下"，默认不进手稿，但不用移动文件。

**启示**：状态机不要硬编码。我们 AI 生成流程里的"草稿→审核→定稿"可以复用同一套自定义标签机制，而不是每处写死枚举。

### 2.4 Manuscript Build 系统（编译式导出，重点）

把"写作存储"和"输出产物"彻底分离，像编译器一样设计：

- **Build 定义是一等公民**：一个项目可存多套 Build 配置（投稿版/出版版/大纲版/人物设定集版）。
- 三层过滤：
  1. **Root 开关**：整类排除（只要正文 / 只要笔记大纲）。
  2. **文档选择**：树形勾选 + 按 Status/Active 过滤 + 单文档强制包含/排除覆盖。
  3. **内容过滤**：排除注释、synopsis、指定标题级别以下的内容等——同一篇文档，正文版导出含注释，投稿版剔除。
- **动态标题排版**：Build 时可给标题注入章节号、场景号、POV 人物名（来自标签显示名）。
- 预览 + 大纲导航 + 精确字数（格式化后统计）。
- 导出走 Pandoc（EPUB/PDF/DOCX），自己不造排版轮子。

**BuildSettings 源码级字段清单**（`novelwriter/manuscript/buildsettings.py`，这是 Build Profile 配置面的完整答案，直接照搬命名空间结构）：

```python
# BuildCollection：多套 Build 并存，每套 {name, uuid, order, format, default}
# 选择层：skipRoot(set) / excluded(set) / included(set) —— 强制覆盖优先于过滤
"filter.includeNovel": True, "filter.includeNotes": False, "filter.includeInactive": False
# 标题层：每个结构层级(Part/Chapter/Unnumbered/Scene/AltScene/Section) × 三种操作
"headings.fmtChapter": nwHeadFmt.TITLE,   # 标题模板(可注入章节号/POV 等动态段)
"headings.hideScene": False, "headings.breakChapter": True, "headings.centerTitle": True
# 内容层：按块类型开关 + 关键字黑名单
"text.includeSynopsis": False, "text.includeComments": False, "text.includeKeywords": False,
"text.ignoredKeywords": ""
# 排版层：字体/行距/对齐/Unicode 清洗/对话高亮
"format.lineHeight": 1.15, "format.justifyText": False, "format.stripUnicode": False,
"format.showDialogue": False, "format.colorHeadings": True
```

**启示**：Build 配置不是布尔开关的堆，而是 `选择 → 标题 → 内容 → 排版` 四个命名空间的声明式数据（每套 Build 一个 JSON/YAML），天然可 diff、可分享、可由插件贡献新键。

**启示**：我们的"导出"目前大概率是单一路径。应改成 **Build Profile** 概念：`选择器（root/文档/内容过滤） + 变换器（标题注入/剔除规则） + 渲染器（内部格式→目标格式）` 三段式。这也天然是个插件点。

### 2.5 其他小而美的机制

- **Split/Merge**：按标题把一个文档拆成子文档、或合并多个文档——写作前期用大文档搭结构，后期拆分填充。文档可互为父子（文档下挂文档）。
- **Templates 根文件夹**：放进来的文档自动成为"新建文档"模板，模板首行标题会被替换为新文档名。零代码模板系统。
- **Archive 语义**：归档 = 从索引中消失（标签失效、引用断开、不进大纲不进手稿），但文件还在。删除前的安全层。
- 存储：项目 XML（mwProject）+ 会话 XML + UTF-8 纯文本（markdown 变体）。**纯文本优先，Git 友好**。

## 3. 架构分层（源码视角）

```
novelwriter/
├── core/        # 领域层：project(项目)、tree(树)、document、index(扫描索引器)、
│                # status/importance、sessions、storage、projectxml
├── enum/        # 枚举集中定义（root 类型、标签关键字、导出格式…）
├── editor/      # 编辑器（Qt 自绘，含 markdown 变体高亮、@关键字校验）
├── gui/         # 窗口/面板/树/大纲视图
├── tools/       # 侧栏工具：manuscript(Build)、outline、statistics、dictionaries
├── formats/     # 文本→HTML/txt 转换
└── models/      # Qt 数据模型（树模型、列表模型）
```

值得注意：**index.py 是心脏**——所有功能（引用面板、大纲、统计、Build）都消费同一个索引，而不是各自查库。这是"单一事实来源"的轻量实现。

`Index` 类的源码级要点（`core/index.py`，约 500+ 行）：
- **索引持久化到磁盘**（`saveIndex/loadIndex`），带 `indexRevision` 版本号——缓存失效判断靠"格式版本 + 文件 mtime"（`indexChangedSince/rootChangedSince`），不是每次全量重扫。
- 增量入口：`reIndexHandle(tHandle)` 单文档重扫、`deleteHandle` 删除清理——**索引器有明确的增量 API**，这是 AI 高频改写场景下我们必须具备的能力。
- `scanText()` 逐块解析：标题 → 关键字（`_indexKeyword`）→ 字数分桶（`_indexWordCounts`，按标题层级累计）；Active/Inactive 文档走不同扫描路径（`_scanActive/_scanInactive`）。
- 扫描结果同时喂给 NovelModel（大纲视图的数据模型）——一次扫描，多处消费。

## 4. 我们要抄什么（映射到 ai-novel）

1. **引用关键字系统** → 给 chapters/foreshadowing/consistency 建立"文本内声明、索引器提取"的引用层。人物/地点/伏笔的关联不再依赖表单外键。
2. **Root 类型 = 数据类别的语义锚点** → 我们的 knowledge/cards 太泛，characters/world 太硬。改成"类型可注册"的类别系统：插件可以声明新类别（如 `MagicSystem`），自动获得标签/引用/Build 过滤能力——**这正是插件化的地基**。
3. **Build Profile 三段式导出** → 替换现有导出功能。
4. **Status/Importance 用户自定义 + 程序不解释** → 收敛我们散落的硬编码状态枚举。
5. **Templates 文件夹** → 低成本先做，写作工具刚需。
6. **索引器单一事实来源** → 对应我们缺一个全局 IndexService，各 feature 现在各自为政。

## 5. 不要学的

- Qt 自绘编辑器：我们该用 Web 编辑器内核（见 09 篇），只抄它的**语法设计**（@关键字 + 实时校验高亮），不抄实现。
- 纯文件存储无数据库：对单机够用，但我们要支持 AI 并发读写和万级条目，需要"文件为源、索引为缓存"的混合模式。
- 无协作、无同步：它的空白，恰是 Trilium 的强项（见 03 篇）。

## 6. 参考

- 项目组织：docs/source/usage/organising_project.rst
- 标签引用：docs/source/usage/tags_and_references.rst
- Build 工具：docs/source/user_interface/manuscript.rst
- 存储格式：docs/source/technical/storage.rst
- 在线文档：https://novelwriter.readthedocs.io
