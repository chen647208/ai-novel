# 15 系统补齐：快捷键自定义、标签分组、托盘自启、代理

## what

1. **快捷键自定义**：设置页录制（按下组合即录入）+ 冲突检测；
   生效域与现有硬编码一致（Ctrl/Cmd+J、Ctrl/Cmd+1..5、Ctrl/Cmd+F）；
   存 settings（`keybindings?: Record<actionId, string>`），缺席回退默认。
2. **标签分组**：`Project.tags?: string[]`（缺席=[]，免迁移）；
   书籍库按标签过滤 + 新建/卡片菜单打标。
3. **托盘自启**：托盘图标（复用应用图标）+ 最小化到托盘 + 开机自启开关
   （`app.setLoginItemSettings`，设置页）；关闭窗口默认最小化到托盘，
   右键菜单退出。
4. **代理**：设置页 HTTP/SOCKS5 地址 + 测试连接；主进程网关 fetch 经
   `ProxyAgent`（undici），空地址即直连；Ollama 本地豁免提示。

## why

- 对标 VS Code（快捷键/托盘）、Obsidian（标签/文件夹组织）、
  Cherry Studio（代理+测试）。现状：硬编码/无分组/无托盘/纯文字提示。

## 验收标准

1. 单测：快捷键冲突检测；标签过滤；代理地址校验。
2. 手工：改键即时生效；打标过滤；托盘退出/恢复；代理开/关对照。
3. 不回归：`verify` 全绿；缺席配置全部回退默认。
