# 插件模板

复制本目录为 `plugins/<你的插件 id>/` 后改名即可开始。步骤：

1. 把 `plugin.json` 的 `id` 改成你的反向域名（如 `com.yourname.my-plugin`），改 `name`/`description`/`license`。
2. 按需保留贡献目录：`skills/`、`logic/`、`editor/`、`types/`；不需要的目录与对应 `contributes` 键一并删掉。
3. 整目录拷到应用数据目录的 `plugins/` 下并重启，在设置 → 插件查看状态与错误。

## 目录约定

```
plugin.json          # manifest v0（必填）
skills/<name>/        # SKILL.md（资源轨）+ 可选 handler.js（逻辑轨）
logic/                # 逻辑贡献：每文件导出具名函数，调用时进沙箱
editor/index.html     # 编辑器扩展：null-origin iframe
types/*.json          # 类型模板（数组），装载时自动加短 id 前缀
hooks.json            # 声明式 hooks（可选）
```

## 边界

- 逻辑型代码在沙箱内运行，默认拒绝一切宿主能力，只能返回建议的工具调用。
- 编辑器扩展无同源、无网络，只能经 `postMessage` 请求白名单内的编辑器操作。
- 路径必须相对且不含 `..`；单文件 ≤128KiB、单贡献键 ≤32 文件、总计 ≤96 文件/2MiB。
- 许可：插件可自选（含闭源）；宿主 SDK 独立 MIT，不传染。

详见 `docs/guides/writing-a-plugin.md` 与 `docs/design/04-plugin-system.md`。
