# TriliumNext 调研：通用数据模型、同步协议与"节点即万物"

> 调研日期：2026-08-31 ｜ 仓库：https://github.com/TriliumNext/Trilium ｜ 37.6k★ ｜ TypeScript 全栈（Electron + Express + SQLite）｜ 极活跃（当天有提交）
> 定位：层级笔记/个人知识库。非 AI 写作工具，但它是**同类中工程化程度最高、数据模型最通用**的项目，且原 Trilium 停更后社区接管（TriliumNext）本身就是开源治理案例。

## 1. 为什么值得深挖

我们的目标是"各类型数据的通用小说创作工具，什么功能都敢塞"。Trilium 用一套**只有 6 个实体的数据模型**装下了文本、代码、文件、画布、Mermaid、任务、网页剪藏、聊天机器人……一切。它就是"通用数据容器"这个问题被工业级回答过的样子。

## 2. 核心架构拆解

### 2.1 桌面模式也是 C/S 架构

即使单机 Electron，Trilium 也拆成 **backend（Express + SQLite）+ frontend（浏览器 UI）**，中间走 REST + WebSocket。Electron 只是把 server 嵌进桌面进程。

收益：
- 同一份 client 代码跑在桌面、服务器 Web、移动端浏览器（apps/client 被 desktop/server/mobile 共享）。
- **API 面是稳定的公共契约** → ETAPI（External Trilium API）直接暴露给第三方，AI 工具、浏览器扩展（web-clipper）、用户脚本全部走同一 API。
- 对我们：ai-novel 现在是"渲染进程直连一切"。如果未来想让 AI agent、外部工具、甚至手机访问创作数据，**现在就该把内部服务层做成 HTTP/WS API 优先，Electron IPC 只是它的本地壳**。

### 2.2 六实体数据模型（重点，逐条映射）

```
Note ──被 Branch 链接──> 树结构
Note ──携带 Attribute──> 元数据（label 标签 / relation 关系）
Note ──拥有 Revision───> 历史版本
Note ──拥有 Attachment─> 附件（role + mime）
内容/附件 ──落在 Blob──> 二进制存储（可加密）
```

- **Branch 是独立实体** → 一个 Note 可以有多个父节点（克隆）。同一章既出现在"阅读顺序树"，又克隆进"POV 顺序树""时间线树"——**多视图组织同一份数据，零复制**。这直接解决我们 chapters/timeline/outline 三个 feature 数据打架的问题。
- **Attribute = key-value，两种：label（值）和 relation（指向另一节点的边）**，可标记 `inheritable`（子节点继承），可标记 `promoted`（在 UI 上以表单字段呈现）。**新数据类型 = 新 label 约定，不需要 schema 迁移**。人物卡就是"一个文本 Note + `character` label + `alias`/`spouse` relation"。
- **Revision**：每次编辑自动存版本，独立于 Git。我们的 version feature 应对标这个而不是只做手动快照。
- **Blob**：内容、附件、版本统一进 blob 表，按 id 引用，支持逐条加密。

**BAttribute 源码级细节**（`packages/trilium-core/src/becca/entities/battribute.ts`，写我们实体层前值得精读）：

- **实体自己声明同步哈希字段**：`static hashedProperties = ["attributeId","noteId","type","name","value","isInheritable"]`——"哪些字段参与同步比对"是实体类的元数据而非同步服务的配置表，新增字段时被迫思考要不要同步。
- **预计算规范化字段**：`normalizedName/normalizedValue`（小写+去变音）构造时算好，注释明说"避免热循环里重复 normalize()"。
- **一次构造挂三处索引**：`becca.attributes[id]` + 所属 note 的 `ownedAttributes` + `attributeIndex["${type}-${name}"]`，关系查询 O(1)。
- **乱序同步的骨架实体**：attribute 先到、目标 note 未到时先 `addNote(new BNote({noteId}))` 建空壳占位，后到数据再填充——**最终一致性下引用完整性不崩的最小方案**。我们索引器/AI 并发写入必遇同类问题，直接抄。
- promoted attribute 的"显示名|描述|类型"定义串由独立包 `@triliumnext/commons` 的 `promotedAttributeDefinitionParser` 解析——**类型约定的语法是共享库**，客户端/服务端/ETAPI 一份实现。

**这就是"通用"二字的实现方式：实体类型极少，语义全靠 Attribute 约定堆出来。** 我们项目里每加一种数据就加一张表/一个 feature 的做法，到 20 种数据时会崩溃。

### 2.3 同步协议（entity_changes，值得完整抄走）

双向同步，设计目标：并发修改、部分同步、省带宽、加密内容也能同步。

- 每次实体修改写一条 `entity_changes`：`{entityName, entityId, hash(SHA-256), changeId(UUID), componentId, instanceId, isSynced, utcDateChanged}`。
- 每个安装实例有 `instanceId`（进程级）和 `componentId`（组件级，用于避免刷新正在编辑的组件）。
- 握手：client 报 `maxChangeId` → server 回"你落后多少 / 你未推送多少" → 分别 pull/push。
- **冲突策略：last-writer-wins（按 hash 比对，无 merge conflict 提示）**——简单，但对写作场景是双刃剑（见"不要学的"）。
- 同步的是实体行，不是文件；加密笔记同步密文。

对我们：哪怕暂时单机，**entity_changes 表 + instanceId 也应该现在就埋进存储层**——它是多设备同步、AI 修改审计、协作的同一块地基。补一个"谁改的"字段（userId/agentId）就得到 AI 写入审计日志。

### 2.4 脚本引擎与 ETAPI（用户可编程 = 事实插件系统）

- 内置 Script Engine：用户脚本本身就是树里的 Note（code 类型），可注册为实体变更触发器、启动钩子、快捷键动作。
- `script-deployer`：独立小工具，把本地脚本目录部署进 Trilium——**脚本开发工作流**。
- ETAPI：token 鉴权的外部 REST API，官方文档齐全，社区据此做了 CLI、同步工具、AI 桥接。
- 缺点（社区公认）：脚本直接跑在完整权限上，**没有沙箱、没有权限声明**——这是它"可编程但非插件化"的边界，恰是 deepseek-harness 式"一切皆插件"要解决的。

### 2.5 Launcher：UI 槽位系统

左侧启动栏分"可见/可用"两态，用户可增删；新增 launcher 时老用户自动获得。这是最小的 **UI contribution point** 实现：注册表 + 用户偏好覆盖 + 增量下发。我们做插件 UI 时，"插件往哪放"的问题（侧栏/命令面板/右键菜单/编辑器工具栏）就是若干个这样的槽位。

### 2.6 加密与权限

逐笔记加密（AES-128-CBC + PBKDF2），"protected session" 限时解锁；支持 OIDC 登录与 TOTP 2FA（服务器模式）。启示：**敏感数据（未发表的手稿！）的加密粒度应该是条目级，且有会话级解锁**，不是整个库一把锁。

## 3. 我们要抄什么（映射到 ai-novel）

1. **六实体通用模型** → 重构方向：`Node(内容) + Edge(多父/关系) + Attribute(label/relation) + Revision + Attachment + Blob`。现有 characters/world/timeline/knowledge/cards 全部坍缩成"Node + 类型约定"。类型约定注册表化（插件可声明新类型 = 新默认 attributes + 新渲染器）。
2. **Branch 多父克隆** → 章节在"顺序树/POV树/时间线树/伏笔树"间共享，彻底解决 feature 间数据同步问题。
3. **entity_changes + instanceId** → 立即埋入存储层；加 agentId 字段得到 AI 审计。
4. **API-first（REST/WS）** → 内部服务层先定 API 契约，Electron IPC 变薄壳；AI 工具（MCP server）与外部集成共用同一 API。
5. **Revision 自动版本** → 升级 version feature：每次 AI 改写自动存 revision，可 diff 可回滚。
6. **Launcher 槽位** → 插件 UI 贡献点的起点。
7. **promoted attribute 的"约定即表单"** → 卡片类 UI 从硬编码字段改为按类型约定渲染。

## 4. 不要学的

- **jQuery 自绘 widget 体系**：正在被官方抛弃（迁 React/Preact），我们直接 React，只抄概念不抄实现。
- **LWW 无提示冲突**：写作场景丢段落比丢笔记严重得多。我们同步层要加"冲突副本 + 可视化对比"，AI 改写走 Revision diff 而非静默覆盖。
- **CKEditor 5 深度魔改**：他们为编辑器 fork 了整套源码（packages/ckeditor5），维护成本巨大。我们用 TipTap/BlockNote 的标准扩展机制（见 09 篇），别 fork 内核。
- **单用户 SQLite 强耦合**：多用户能力是后补的（OIDC 等），我们若考虑云同步要提前设计租户边界。

## 5. 参考

- 架构：docs/Developer Guide/Architecture.md
- 实体模型：Concepts/Entities.md
- 同步协议：Concepts/Synchronisation.md
- 启动器：Concepts/Launchers.md
- 实体源码：`packages/trilium-core/src/becca/entities/`（注意：已从 apps/server 迁到共享包，默认分支 main）
- ETAPI：apps/server/src/etapi/
- 许可证：AGPL-3.0（同样：**抄设计，不抄代码**）
