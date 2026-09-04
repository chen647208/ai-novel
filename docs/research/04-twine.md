# Twine 调研：写作工具领域最成熟的插件规范

> 调研日期：2026-08-31 ｜ 仓库：https://github.com/klembot/twinejs ｜ 2.9k★ ｜ TypeScript + React + CodeMirror + Electron ｜ 活跃（最近推送 2026-08-22）
> 定位：非线性互动小说（hypertext fiction）编辑器。非 AI。它的 **Story Format 机制是写作软件里唯一经历过 10+ 年、数千第三方插件考验的插件规范**。

## 1. 为什么值得深挖

Twine 把"大而全 + 什么都能塞"做到了极致，方式很激进：**编辑器本体只是个壳**——它自己完全不懂任何故事语法。语法、渲染、运行时全部由第三方 Story Format（SugarCube、Harlowe 等）提供。这正是我们插件化思想的极限形态，而且它用文档明确回答了两个 deepseek-harness 还没回答的问题：**插件与宿主的版本兼容**、**插件能力的边界声明**。

## 2. 核心机制拆解

### 2.1 Story Format = 编译器 + 运行时 + 编辑器扩展 三合一

- 一个 Story Format 是一个自包含文件，内含：故事语法编译器、游戏运行时（打包进导出的 HTML）、以及可选的编辑器扩展。
- **导出的作品是单个 HTML 文件，自带运行时**——"产物即应用"。对我们的启示：小说的"发布产物"（EPUB/网页/互动版）可以由"发布格式插件"生成，而不是内核内置导出器。
- 编辑器与格式解耦：Twine 官方明说"用户可能用别的编译器/编辑器（twee/extwee/Tweego）配合同一格式"——**格式规范是公开的，编辑器只是参考实现**。这倒逼数据格式保持简单可移植。

### 2.2 JSONP + hydrate：数据与代码的严格分离

格式文件本体是纯数据（JSONP 包裹的 JSON，不可执行）。**实测验证**：twinejs 仓库自带的发行格式 `public/story-formats/harlowe-3.3.9/format.js` 第一行即 `window.storyFormat({"name":"Harlowe","version":"3.3.9","author":...,"description":...})`——规范与实现严格一致。函数通过 `hydrate` 属性注入：

```javascript
window.storyFormat({
  name: 'My Story Format', version: '1.0.0',
  hydrate: "this.someFunction = () => {...}"  // 同步、无副作用、可重复执行
});
```

对 hydrate 函数的契约约束（全部写进规范）：
- 必须同步；必须无副作用（不改 DOM、不碰全局作用域，只往 `this` 挂属性）；**会被宿主反复调用**（幂等）；不得与 JSON 属性重名（重名时宿主忽略代码版）。
- 解析器函数额外要求：返回去重结果（"不去重不报错，但会拖慢宿主"——用文档而非强制来引导质量）。

**启示**：我们插件 API 的函数契约应该学这种"显式声明调用模式"的写法（同步/幂等/可重入/纯函数），而不是只写个 TS 签名。

### 2.3 版本化扩展 API（最值得抄的一招）

插件针对**宿主版本区间**声明不同的扩展行为：

```javascript
editorExtensions: {
  twine: {
    '^2.4.0-alpha1': { codeMirror: {...}, references: {...} },
    '^3.0.0':        { /* 新宿主用新写法 */ }
  }
}
```

- 宿主用 semver `satisfies()` 匹配自己的版本，取对应分支；无匹配则扩展整体失效（优雅降级）。
- 规范警告"版本区间不得重叠，重叠时行为依赖属性枚举顺序、不可预测"——**把坑的边界写明白**。
- 效果：宿主可以破坏性演进 API，老插件靠多版本分支存活，新插件只写新分支。

**这直接回应了 deepseek-harness "compatibility-breaking changes" 的痛点**。我们插件 manifest 里应该内建 `host: "^x.y.z"` 区间 + 按区间分支的能力声明。

### 2.4 扩展点清单（contribution points 的最小集）

Twine 只开了三个编辑器扩展点，全部声明式：
1. **CodeMirror mode**：语法高亮（格式自定义自己语法的着色）。
2. **命令 + 工具栏**：`type: 'button' | 'menu' | 'separator'` 的声明式工具栏描述，宿主渲染。
3. **引用解析器**（见 2.5）。

注意它**不开**的口子：不能改宿主 UI 布局、不能拦截宿主事件、不能持久化任意状态。能力面小而清晰。

**实现侧验证**（源码 `src/store/`）：三个扩展点在 React 侧各对应一个消费钩子——`use-format-codemirror-mode`、`use-format-codemirror-toolbar`、`use-format-reference-parser`，即"插件声明 → 钩子消费"一一对应，宿主没有第四种暗道。持久层是**可替换后端**：`persistence/persistable-changes.ts` 定义变更流，`electron-ipc/` 与 `local-storage/` 两个实现按运行环境选择——同一套状态管理跑在浏览器和桌面，这个抽象值得我们在 11 篇迁移计划里直接采用。

另有一个反面细节：官方格式规范站点 `twinery.org/format-specs` **现已 404**，规范只活在仓库的 EXTENDING.md 里——插件规范的载体必须是仓库内版本化文档（跟着代码走），独立官网会死。

### 2.5 References vs Links：软引用与硬链接的二分

- **Link（硬）**：指向不存在的段落显示断链、重命名段落自动更新、地图画实线。
- **Reference（软）**：由格式插件的 `parsePassageText(text) => string[]` 提取；断链不报警、重命名不更新、地图画虚线。
- 宿主自己**不内置任何引用语法**，引用解析完全保留给插件。

**直接映射到小说场景**：正文里的章节跳转 = 硬链接（一致性检查要管）；`@tag: Jane` 人物引用 = 软引用（人物改名不应重写正文，但引用面板要能列出）。我们 consistency/foreshadowing 的数据模型应该显式区分这两类边。

### 2.6 插件伦理（写进规范的产品原则）

- **扩展永远不能是必需的**："用户可能禁用扩展，也可能用别的编辑器"——故事离开 Twine 也要能用该格式编译。
- 用户可按格式禁用编辑器扩展。
- 扩展代码不进导出产物（不污染成品体积）。

### 2.7 DESIGN_GOALS.md：交互设计原则（免费抄的 UX 宪法）

- 新手 5-10 分钟上手是核心 KPI；复杂功能推给进阶工具（twee/Tweego）。
- **"给合理默认值，而不是弹窗逼用户做决定"**：新建段落先给占位名，不开模态框问名字。
- **避免模式（modes）**：用户可并行开工、中途离开再回来。
- 一切操作可撤销。

这四条应该直接进我们的 UI 规范（我们现在 NewBookModal 这类"先弹窗问一堆"的设计正好违反第 2 条）。

## 3. 我们要抄什么（映射到 ai-novel）

1. **manifest 版本区间分支**（`host: "^x.y"` → 按区间取能力声明）→ 插件规范核心条款。
2. **函数契约显式化**：同步/幂等/无副作用/去重，写进我们的插件 API 文档模板。
3. **硬链接 vs 软引用二分** → consistency 与引用面板的数据模型。
4. **声明式 UI 贡献**（button/menu/separator 描述符，宿主渲染）→ 插件工具栏/菜单贡献点格式。
5. **"扩展非必需"原则** → AI 功能全部按此设计：断网/禁用插件后，纯写作功能必须完整可用。这条对我们"既要 AI 又要常规写作"是架构级约束。
6. **产物自带运行时** → 发布插件（EPUB/互动网页/有声稿）的生成模型。
7. **DESIGN_GOALS 四原则** → 直接改写进我们的 UI 规范。

## 4. 不要学的

- **JSONP 载体**：那是 2010 年代绕跨域的历史产物，我们用标准 `plugin.json` manifest + ESM 模块即可，学它的**数据/代码分离思想**，不学封装。
- **格式必须捆绑扩展**（"standalone extension 不可能"）：对我们是过度限制，插件应可独立于"格式"存在。
- **无沙箱**：hydrate 代码直接跑在主页面里，靠君子协定（"不得有副作用"）。我们有 Electron，可以用 iframe/worker/WASM 做真隔离（见 09 篇 Figma/Zed 方案）。

## 5. 参考

- 扩展规范：EXTENDING.md（全文值得精读，~450 行）
- 设计目标：DESIGN_GOALS.md
- 格式规范：原 twinery.org/format-specs 已 404，现存权威文本即仓库内 EXTENDING.md + 自带格式样例（public/story-formats/）
- 许可证：GPL-3.0（抄设计不抄代码）
