# 07 导出设计：Build Profile 三段式管线

> 依据：novelWriter BuildSettings 全字段实测（调研归档于 git 历史）。落点：替换现有单路径导出（writing 的 TXT/MD/HTML + 原生另存为）。

## 1. 模型：选择 → 变换 → 渲染（编译式导出）

```
BuildProfile（声明式数据，存 books/{id}/.novel/builds/*.yml，可 diff 可分享）
  ├─ selection:  选哪些内容
  ├─ transform:  怎么改写结构
  └─ render:     输出成什么
```

## 2. BuildProfile schema（四命名空间，字段对齐 novelWriter 实测）

```yaml
# 例：webnovel-draft.yml（网文投稿版）
name: 起点投稿版
format: txt                      # 渲染器 id（插件可贡献新渲染器）
selection:
  includeTypes: [novel.chapter, novel.scene]   # ← filter.includeNovel/Notes
  includeInactive: false                        # ← filter.includeInactive（status 过滤）
  exclude: ["node:ch013-draft"]                 # 单点覆盖（novelWriter included/excluded set）
  rootSwitches: { cards: false, meta: false }   # 整类开关
transform:
  headings:
    chapter: "%N、%T"             # 章节号+标题模板（%N %T %POV 动态段）
    scene: "* * *"                # 场景分隔渲染
    hide: [part]                  # 层级隐藏
    renumber: true                # 重排后编号重写
  content:
    includeSynopsis: false        # text.includeSynopsis
    includeComments: false        # 故事内注释/设定旁白剔除
    stripTags: [draft-only]       # text.ignoredKeywords
    resolveRefs: displayName      # @tag → 显示名替换
render:
  font: "Noto Serif SC"           # format.* 排版组
  lineHeight: 1.15
  chapterPageBreak: true
  stripUnicode: false
```

## 3. 管线实现（`src/core/build/`）

```ts
interface BuildPipeline {
  select(profile, index): Node[];                    // 纯函数，消费索引器（03 篇）
  transform(nodes, profile): Doc;                    // 变换器注册表：{id, apply}
  render(doc, rendererId, profile): ReadableStream<Uint8Array>;  // 渲染器注册表
}
// 两个注册表都是插件贡献点（04 篇 #3）：
//   变换器贡献示例：AI 味消除预处理、敏感词替换（声明式，非默认启用）
//   渲染器首批：md / txt / html（内置）→ epub / docx / pdf（P4，epub 走 JSZip 自拼，docx 评估 pandoc 可选依赖）
```

- **Build 定义是一等公民**：多套并存、列表管理、克隆、导入导出（.yml 文件即分享单元）。
- 预览：内置 HTML 预览面板（复用 CM6 只读模式），大纲导航 + 格式化后精确字数（novelWriter 实测特性）。
- 字数统计统一口径：`selection+transform` 后的文本才是"成稿字数"——写作统计服务（writingStatsService）改为消费同一管线，消灭"两套字数"。

## 4. 与现状衔接

| 现状 | 去向 |
|---|---|
| writing 的 TXT/MD/HTML 导出 + dialogService 另存为 | 变成内置三个渲染器 + 默认 profile"快速导出" |
| 单书导出（repository.exportBook） | 升级为 DSL 目录打包（.zip of books/{id}/，即开放格式导出） |
| 全量导出（exportAll） | 保留（设置+全部书的 .zip） |

## 5. 验收标准

1. 同一书两个 profile（投稿版/设定集版）产出正确差异。
2. profile yml 往返（编辑→保存→重载）无损。
3. 示例插件贡献一个 `reverse-order` 变换器 + 一个 `rtf` 渲染器，不改内核可被选用（04 篇贡献点自证）。
4. 导出字数与统计面板一致（同源断言测试）。
