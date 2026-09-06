# 魔法体系示例插件

官方示例插件（MIT）：演示资源型贡献点（零代码）——类型模板加写法技能。

## 内容

- `plugin.json`：manifest v0（`com.novalocal.example-magic`）。
- `types/magic-system.json`：`magic-system`（体系）与 `magic-spell`（法术）模板。
- `skills/magic-design/SKILL.md`：魔法设计三件套方法论。

## 命名空间规则（宿主强制）

模板声明 `id`（如 `magic-system`）装载时自动加前缀，
落为 `example-magic.magic-system`；字段内的 `refType` 须直接写落定后的完整 id。

## 安装试用

整目录拷到应用数据目录的 `plugins/` 下并重启，
在设置面板的插件状态中可见；禁用即卸载（unwind）。

## 不包含

逻辑型贡献（renderers / editor / hooks 代码）：v0 运行时不执行插件代码。
rtf 渲染器已有内置版（`core/build`，导出可选 RTF）；插件贡献版等沙箱落地后再补。
