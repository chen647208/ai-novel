# AI Novel DSL（VS Code 扩展）

AI小说家 (ai-novel) 的 **VS Code 线**起点（docs/design/08 M5）：为 novelDsl
提供编辑器级语法支持，让熟悉 VS Code 的作者可以在外部编辑书籍 DSL 文件。

## 功能（v0.1）

- `novel-dsl` 语言（`.nmd` / `.novel.md`）
- TextMate 语法高亮：
  - frontmatter 元数据（`---` 包围）
  - Markdown 章节标题
  - 场景分隔（`* * *` / `＊　＊　＊`）
  - 关键字声明行（`# @role: value` / `@status: draft`）
  - wiki 硬链接（`[[nodeId|别名]]`）
  - `@tag` 软引用
  - NEO 式占位符（`{name|kind}`）
  - 受保护标记（`[protected]`）
- 括号/引号自动闭合（全角【】支持）

## 安装（开发期）

```
cd vscode-ai-novel
npx vsce package
code --install-extension ai-novel-dsl-0.1.0.vsix
```

## 后续（design/08 M5）

- 通过 MCP server（`build/main/main/mcp/server.js`）直接读写书籍数据
- 命令：`AI Novel: 导出当前书` / `AI Novel: 打开待审箱`
- 与桌面应用的热重载同步（entity_changes pull）
