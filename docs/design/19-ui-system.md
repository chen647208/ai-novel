# 19 UI 系统机制：一致性不靠个人品味

本文件定义界面一致性的五条机制。机制以 `docs/features/ui-catalog.md`（组件清单）与
`.dependency-cruiser.cjs`、`eslint.config.js`、`e2e/`（门禁）为承载体。
设计原则引自 `06-editor-and-ui.md` 的 UI 宪法；本文件只补"如何让一致性不依赖个人发挥"。

## 一、问题

界面质量由三件事拼成：交互是否符人性、功能流程是否顺、底层是否稳。个人精力有限时，
最容易退化为"每次手写一套"，表现为：同一交互多种实现、缺少空/加载/错误态、
键盘与读屏不可用、改流程凭灵感而非对标。机制的目标是把这些从"每处重新决策"变成"默认唯一解"。

## 二、五条机制

### 机制一：组件清单单一来源

- 所有通用交互只能使用 `docs/features/ui-catalog.md` 列出的 `shared/ui` 组件与 `dialogService`。
- 新交互先查清单；清单没有才新增组件，并在同一次改动里登记清单。
- 禁止在业务代码手写清单组件的第二套类串（如另一种模态、另一种页签）。

验收：同类交互全仓 grep 只有清单组件一种实现；共享组件无"零引用"死件。

### 机制二：状态四态契约

任何数据驱动视图必须覆盖四态：**空 / 加载 / 错误 / 成功**。

- 空：`EmptyState`（给标题、说明、可选动作）。
- 加载：`LoadingState`（骨架或文案，禁止空白等待）。
- 错误：`Alert tone="error"` 或 `ErrorBoundary` 兜底，给可执行的下一步。
- 成功：正常内容。

验收：新增/修改面板时，四态各有可见实现；缺态即按 bug 处理。

### 机制三：对标而非灵感

改动交互流程前先对标成熟项目（Cherry Studio / SillyTavern / OpenWebUI / LibreChat 等），
把差异写进 issue：参考形态、本项目取哪点、为什么不照搬。

验收：涉及流程的改动在 issue 内有对标记录；UI 只改样式不动流程视为打补丁。

### 机制四：无障碍与键盘可用

- 静态：`jsx-a11y`（lint 门禁）+ 语义标签/`aria-*`。
- 动态：`e2e/a11y.spec.ts` 用 axe-core 拦 serious/critical。
- 键盘：模态焦点陷阱、`Esc` 关闭、`Tab` 可达、按钮可回车/空格触发。

验收：axe 零 serious/critical；模态类组件有焦点与 `Esc` 的 E2E 断言。

### 机制五：AI 起草、人做裁决

界面稿与组件由 AI 按本文件与清单产出初稿，人只做方向与验收。
判断标准是"是否符合清单与四态契约"，不是个人审美。

验收：组件/页面初稿先由 AI 生成，人按清单逐条核对后合并。

## 三、门禁归属

| 机制 | 承载体 | 门禁 |
| --- | --- | --- |
| 组件清单 | `shared/ui/*`、`docs/features/ui-catalog.md` | 人工 review + 清单登记 |
| 状态四态 | `EmptyState`/`LoadingState`/`Alert` | 人工 review |
| 对标 | issue 记录 | 人工 review |
| 无障碍/键盘 | `eslint` jsx-a11y、`e2e/a11y.spec.ts`、`e2e/extended.spec.ts` | CI |
| AI 起草 | 工作流约定 | 人工 review |

文风与"是否符人性"只做人工把关，不进 CI（沿用 `18-standardization.md` 的裁决）。
