/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 出版封装纯函数（docs/design/13）：HTML 正文 → ePub / DOCX 文件集。
 * 只产出 {文件名: 文本内容} 映射；zip 打包与落盘在主进程（IPC 传 JSON 可序列化）。
 * 不引入任何第三方依赖。
 */

const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface PackageInput {
  title: string;
  intro?: string;
  /** 已渲染的 HTML 正文（含书名块与章节标题，沿用导出管线产出）。 */
  htmlBody: string;
}

/** ePub 文件集：mimetype 必须首项无压缩（主进程 STORE 打包保证顺序）。 */
export function buildEpubFiles(input: PackageInput): Record<string, string> {
  const title = xmlEscape(input.title || 'Untitled');
  const intro = input.intro?.trim()
    ? `<p class="intro">${xmlEscape(input.intro.trim())}</p>`
    : '';
  const xhtml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!DOCTYPE html>',
    '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN">',
    `<head><title>${title}</title><meta charset="utf-8"/></head>`,
    `<body><h1>${title}</h1>${intro}${input.htmlBody}</body>`,
    '</html>',
    '',
  ].join('\n');
  return {
    'mimetype': 'application/epub+zip',
    'META-INF/container.xml': [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
      '  <rootfiles>',
      '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>',
      '  </rootfiles>',
      '</container>',
      '',
    ].join('\n'),
    'OEBPS/content.opf': [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">',
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title><dc:language>zh-CN</dc:language><dc:identifier id="book-id">hongyue-export</dc:identifier></metadata>`,
      '<manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"/></manifest>',
      '<spine><itemref idref="content"/></spine>',
      '</package>',
      '',
    ].join('\n'),
    'OEBPS/content.xhtml': xhtml,
  };
}

interface DocxPara {
  text: string;
  heading: 0 | 1 | 2;
}

/** HTML 子集 → 段落（h1/h2/p；其余标签去标记留文本）。 */
export function htmlToDocxParagraphs(html: string): DocxPara[] {
  // <br> 先换成换行，避免与块标签粘连
  const normalized = html.replace(/<br\s*\/?>/gi, '\n');
  const out: DocxPara[] = [];
  const pushLines = (text: string, heading: 0 | 1 | 2): void => {
    for (const part of text.split('\n').map((s) => s.trim()).filter(Boolean)) {
      out.push({ text: part, heading });
    }
  };
  const re = /<(h1|h2|p|div)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let consumed = false;
  while ((m = re.exec(normalized)) !== null) {
    consumed = true;
    const tag = m[1]?.toLowerCase();
    const inner = (m[3] ?? '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
    if (!inner) continue;
    pushLines(inner, tag === 'h1' ? 1 : tag === 'h2' ? 2 : 0);
  }
  if (!consumed) {
    // 非标签纯文本：按空行分段兜底
    for (const part of normalized.split(/\n\s*\n/).map((s) => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean)) {
      out.push({ text: part, heading: 0 });
    }
  }
  return out;
}

/** DOCX 文件集：最小 Word 文档（document.xml + 必备 rels）。 */
export function buildDocxFiles(input: PackageInput): Record<string, string> {
  const paras: DocxPara[] = [{ text: input.title || 'Untitled', heading: 1 }];
  if (input.intro?.trim()) paras.push({ text: input.intro.trim(), heading: 0 });
  paras.push(...htmlToDocxParagraphs(input.htmlBody));
  const body = paras
    .map((p) => {
      const style = p.heading === 1 ? 'Heading1' : p.heading === 2 ? 'Heading2' : 'Normal';
      return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${xmlEscape(p.text)}</w:t></w:r></w:p>`;
    })
    .join('');
  return {
    '[Content_Types].xml': [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
      '</Types>',
      '',
    ].join('\n'),
    '_rels/.rels': [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
      '</Relationships>',
      '',
    ].join('\n'),
    'word/document.xml': [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      `<w:body>${body}</w:body>`,
      '</w:document>',
      '',
    ].join('\n'),
  };
}
