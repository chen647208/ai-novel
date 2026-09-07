# @ai-novel/plugin-sdk

红月创作（Hongyue Creation）插件 SDK（MIT 独立发行）。

宿主为 AGPL-3.0；插件经本 SDK 的公开类型/协议与宿主交互，属于独立作品，
不构成宿主衍生作品（见 docs/guides/licensing.md 与 design/04 §9）。

插件 = 一个目录：

```
com.example.golden3/
├── plugin.json        # manifest v0（本 SDK 的 PluginManifest）
└── skills/            # SKILL.md 写法技能（资源型贡献点，零代码）
```

放置到应用数据目录的 `plugins/` 下即可被宿主发现；贡献点的装配、
权限（deny-by-default）、故障隔离与 unwind 见 docs/design/04。
