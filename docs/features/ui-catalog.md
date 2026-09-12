# UI 组件清单与用法

本文件是界面一致性的唯一组件清单：通用交互只准用清单内组件，禁止在业务代码手写第二套。
机制与验收标准见 `docs/design/19-ui-system.md`；组件实现位于 `src/renderer/shared/ui/`。
添加组件时在同一次改动里登记本文件。

## 一、基础组件

| 组件 | 用途 | 关键 props | 备注 |
| --- | --- | --- | --- |
| `Button` | 全局按钮 | `variant`: default/secondary/outline/ghost/destructive/link；`size`: sm/md/lg/icon；`block` | 主操作用 default，破坏性操作用 destructive |
| `IconButton` | 纯图标按钮 | `label`（必填，落 `aria-label`/`title`）、`tone`: default/muted/danger、`active` | 任何只有图标的按钮都用它，禁止裸 `<button>` 配 `<svg>` |
| `Input` / `Textarea` | 文本输入 | 原生 input/textarea 属性 | 配 `FormField` 给标签与提示 |
| `Select` | 下拉选择 | `value`/`onChange`/`disabled`/`id`/`title` | Radix 封装；无可见标签时必须给 `title`/`aria-label` |
| `Checkbox` | 复选框 | 原生 checkbox 属性 | 禁止裸 `input[type=checkbox]` |
| `Switch` | 开关 | Radix Switch 属性 | 布尔开关场景优先于 Checkbox |
| `Label` / `FieldLabel` | 表单标签 | `htmlFor` | `FieldLabel` 为纯文本标签样式 |
| `FormField` | 标签 + 提示 + 控件容器 | `label`、`htmlFor`、`hint` | 表单单字段首选 |
| `Badge` | 状态标签 | `variant` | 轻量状态/分类标记 |
| `SchemaForm` | 按 JSON Schema 渲染设置表单 | `schema`/`value`/`onChange` | string/number/boolean；贡献设置面板用它，不手写表单 |
| `PluginFrame` | 插件 UI 沙箱宿主 | `html`/`onMessage` | null-origin `sandbox="allow-scripts"` iframe，只经消息桥通信 |

## 二、反馈与状态

| 组件 | 用途 | 关键 props | 备注 |
| --- | --- | --- | --- |
| `Alert` | 行内提示条 | `tone`: info/success/warning/error、`title`、children | error 自动带 `role="alert"`；错误态首选 |
| `EmptyState` | 空态 | `icon`（lucide 组件）、`title`（必填）、`description`、`action` | 任何列表/面板无数据时必用 |
| `LoadingState` | 加载态 | `label` | 禁止空白等待 |
| `Spinner` | 轻量旋转指示 | — | 局部加载；整块加载用 `LoadingState` |
| `Progress` | 进度条 | `value` | 上传/生成进度 |
| `ErrorBoundary` | 渲染错误兜底 | `children` | 应用壳层兜底，不用于局部错误 |

## 三、容器与布局

| 组件 | 用途 | 关键 props | 备注 |
| --- | --- | --- | --- |
| `Card`（+Header/Title/Description/Content/Footer） | 卡片容器 | `interactive`、`selected` | 可点击卡片用 `interactive`，选中态用 `selected` |
| `PageHeader` | 页面标题区 | — | 页面级标题与操作 |
| `TabBar` | 页签 | `value`/`onChange`/`items`、`variant`: underline/block | 面板内分类切换 |
| `ViewModeToggle` / `SegmentedControl` | 视图切换 | `value`/`onChange`/`options` | 网格/列表、分段选择；禁止各处手写第二套 |
| `Tooltip` | 悬浮说明 | Radix Tooltip 属性 | 图标按钮的可选补充，不替代 `label` |

## 四、模态与对话框

| 场景 | 组件 | 说明 |
| --- | --- | --- |
| 一般模态（标题 + 内容 + 页脚） | `ModalShell` | `open`/`onOpenChange`/`title`/`description`/`icon`/`size`(sm/md/lg/xl)/`footer`/`hideClose`；Radix Dialog 提供焦点陷阱与 Esc 关闭 |
| 自带头部的复杂模态 | `ModalShell bare` | 只借外壳（Portal/Overlay/Content），头部自绘 |
| 需要用户确认/否决 | `AlertDialog` | 破坏性操作确认 |
| 程序化提示/确认/输入 | `dialogService.alert` / `confirm` / `prompt` | `alert` 返回 void；`confirm`/`prompt` 返回 Promise；删除确认统一走 `confirm`，禁止组件内两段式确认状态机 |
| 原生对话框 | `Dialog` 及其子组件 | 仅 `ModalShell` 未覆盖的底层场景 |

## 五、状态四态契约

数据驱动视图必须覆盖四态，缺态按 bug 处理：

- 空 → `EmptyState`
- 加载 → `LoadingState`（或 `Spinner`）
- 错误 → `Alert tone="error"`，必要时 `ErrorBoundary`
- 成功 → 正常内容

## 六、主题与令牌

- 颜色/间距/圆角/阴影一律走 Tailwind 令牌（`bg-card`、`text-muted-foreground`、`rounded-lg` 等），
  禁止任意值（如 `text-[0.9em]`）绕过令牌。
- 层级走令牌，禁止散落 `z-[10000]`。
- 展示用日期/数字走 `shared/utils/format` 单源。
