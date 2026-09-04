# 06 编辑器与 UI 设计：双内核、写作原语与槽位系统

> 依据：research/09（TipTap/CM6 源码实测）、06（写作原语清单）、04（Twine UI 宪法）。落点：替换 `WritingEditorCanvas` 的 textarea，重写 App.tsx 状态层；Radix/Tailwind/i18n 全部保留。

## 1. 双内核接入

### 1.1 正文区：TipTap（novel schema）

```ts
// src/renderer/editor/schema.ts —— 小说文档 schema（集中声明，公理：schema 先行）
nodes: doc | paragraph | heading(1-3)
     | sceneBreak          // *** 分隔（Enter×2 产物）
     | chapterRef          // [[硬链接]]（03 篇）
     | placeholder         // NEO 式占位符：{name|fact|date} + 便签文本，装饰红点
     | darlingSlot         // 弃稿锚点（拖出时原位留痕）
     | ghostNote           // 幽灵大纲：灰色可覆盖段落（来自 Node.attrs.synopsis）
     | dialogueBlock       // 对话块（Fountain 启发：角色行+对白，导出/统计可识别）
marks: em | strong | quoteStyle(弯引号态) | tagRef(@tag 软引用高亮)
```

- 依赖：`@tiptap/core @tiptap/react @tiptap/pm`（MIT）。
- 现有 WritingEditor 的 1174 行编排**不重写**：toolbar/sidebar/overlay/AI 面板/快照/统计的编排逻辑保留，只把 `WritingEditorCanvas`（textarea）换成 `TipTapCanvas`，内容序列化走 03 篇 DSL。
- 专注模式/打字机模式在 PM 装饰层重实现（现有实现是 textarea 滚动 hack）。

### 1.2 大纲/DSL 区：CodeMirror 6

- 大纲编辑（StepOutline 的文本域）、卡片正文、设置里的 prompt 编辑 → CM6 + 自定义 `novelDsl` language：
  - `@tag:`/`@pov:` 等关键字高亮；**引用校验波浪线**（tag 不存在→invalid，novelWriter 编辑器体验）；
  - frontmatter 语法高亮；`[[链接]]` 自动补全（补全源 = 索引器 tags）。
- 大纲的"结构视图"（章节树拖拽）保留现有 React 实现，数据源换 Edge.contain。

### 1.3 单一变更管线（架构不变量）

```
编辑（人/AI/撤销/插件）
  → PM transaction（唯一入口，禁止旁路 setContent）
  → DSL 序列化 → StoreProvider.apply(changes, {agentId})
  → entity_changes + Revision（AI 必留底）
  → 索引增量 reindexFile → 事件总线 fact('node.changed')
```

- 撤销栈 = PM history + Revision 双轨（会话内 PM，跨会话 Revision）。
- AI diff 预览：proposal Revision 与当前 body 的 PM 级 diff 渲染（复用 transaction 管线，不引新 diff 库——PM 有原生 compare）。

## 2. 写作原语（全部做成 TipTap 扩展，自证扩展 API）

| 扩展 | 行为 | 来源 |
|---|---|---|
| `enterFlow` | Enter=新段；×2=sceneBreak；×3=新章（弹章节名默认值，不阻塞——Twine 宪法"给默认值"） | NEO |
| `placeholder` | ⌘⇧X 插入占位符；章节树红点；右侧"待填清单"面板聚合 | NEO |
| `darlings` | 选区拖入 Darlings 面板 → 原位留 darlingSlot 锚点 → 可精确放回 | NEO |
| `ghostOutline` | 场景 synopsis 以灰色段落渲染在正文流，打字即覆盖 | NEO |
| `typography` | em dash/弯引号/省略号自动修正（输入规则） | NEO |
| `spellOnDemand` | 拼写检查仅主动调用（无红波浪线常驻） | NEO |
| `tagDecorate` | @tag 高亮 + 点击跳转卡片 + F2 重命名联动（硬链接才联动，软引用不碰正文——Twine 二分） | novelWriter |
| `chapterRenumber` | 章节拖拽后标题序号自动重写 | warewoolf |

## 3. UI 宪法（Twine DESIGN_GOALS 直接采纳为评审标准）

1. 新手 10 分钟写出第一段——首启路径：新建书（默认名，不开模态）→ 直接进正文。
2. **给合理默认值，不开弹窗逼决定**——`NewBookModal` 现状违反此条，M1 改造为"先建后改"。
3. 无模式（modes）：任何面板可并行开关，任务可中断恢复。
4. 一切可撤销（PM history + Revision 兜底）。

## 4. 应用壳与状态

```
App.tsx（目标 <150 行）
├── Bookshelf 书架视图（保留，升级进度条/封面——NEO 隐喻可选）
├── Workspace（书工作区）
│   ├── WorkspaceNav（左：结构树 = Edge.contain 投影）
│   ├── 主区：写作 | 大纲 | 卡片 | 图谱 | 一致性 | 导出（标签页）
│   ├── 右侧面板栈：引用 | 待填 | 伏笔 | AI 助手（GlobalAssistant 迁入）
│   └── 槽位渲染器（04 篇 §4：插件 UI 贡献的宿主）
└── AuxWindows（P4 评估）：一致性报告/导出预览 → 独立 BrowserWindow（Zettlr win-* 模式）
```

- **状态**：Zustand 双 store（02 篇 §4）。迁移策略：App.tsx 的 useState 逐 feature 切走，M1 完成收编；期间新旧并存由 `persistDiff.ts`（现有！）做一致性哨兵。
- 步骤式工作流（灵感→人物→大纲→章节→写作）**保留为"引导模式"**，同时提供自由工作区（无模式原则的折中：引导是可选轨道不是牢笼）。

## 5. 保留不动的资产

Radix UI 组件、Tailwind v4、i18next（zh/en）、themeService、DialogHost/ToastHost、WorkspaceNav/Topbar 骨架、28 个测试中的 UI 相关用例（随重构改写）。

## 6. 验收标准

1. textarea 从依赖树消失；正文编辑延迟 < 16ms（万字段落基准）。
2. 8 个写作原语扩展各有交互测试（PM 事务级断言）。
3. AI 改稿 diff 预览 → 确认 → 落盘 → 撤销 → Revision 回滚，全链路 E2E。
4. 禁用全部插件 + 断网：写作/大纲/卡片/导出功能完整（公理 4 冒烟）。
5. `@tag` 波浪线校验：引用不存在标签即时标红。
