# 13 导出矩阵：ePub / DOCX（复用 build 管线）

## what

- 导出格式加 `epub` / `docx`：`buildExportContent` 复用 HTML 管线产出，
  主进程转封装（零新运行时依赖，纯手写最小打包器）。
- ePub：mimetype + container.xml + content.opf + 单 XHTML 正文。
- DOCX：`[Content_Types].xml` + document.xml（段落/标题映射）+ 最小 rels。
- 预览复用 HTML；文件名/保存走现有 `saveExportFile`（文本写入即可，无二进制）。

## why

- 对标 Scrivener Compile 出版级格式；投稿与出版只认 ePub/DOCX，
  txt/md/html/rtf 覆盖不到。
- 零新依赖：ePub/DOCX 本质是 zip，主进程手写 STORE 模式打包器
  （无压缩，只需 CRC32 + 中央目录结构，约 120 行，可单测），
  不引入 archiver 之类重依赖。

## 验收标准

1. 单测：zip 包结构（mimetype 首项 + CRC 正确）；epub/container/opf 存在；
   docx document.xml 段落映射；用系统解包器能打开。
2. 手工：投稿版/设定集版双 profile 导出 ePub/DOCX 可读。
3. 不回归：`verify` 全绿；现有四格式行为不变。
