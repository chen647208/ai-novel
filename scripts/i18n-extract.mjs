#!/usr/bin/env node
/*
 * i18n 抽取 / 覆盖率守卫工具（开发期使用，不打包进应用）。
 *
 * 用 TypeScript 编译器 API 把每个 .ts/.tsx 解析成 AST，精确枚举仍含中文的
 * UI 字面量与 JSX 文本节点（注释、已迁移为 t('key') 的 ASCII 键天然不被计入）。
 *
 * 用法：
 *   node scripts/i18n-extract.mjs [目标目录] [--quiet] [--fail]
 *     目标目录  默认 src/renderer
 *     --quiet   只输出汇总计数（适合 CI 守卫）
 *     --fail    发现残留中文 UI 串时以退出码 1 结束
 *
 * 迁移期用它枚举待办；迁移完成后复跑应报告 0，作为“无中文残留”的守卫。
 */

import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const CJK = /[㐀-䶿一-鿿豈-﫿]/;
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'locales', 'i18n']);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const root = args.find((a) => !a.startsWith('--')) || 'src/renderer';
const quiet = flags.has('--quiet');
const failOnFindings = flags.has('--fail');

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      yield* walk(full);
    } else if (/\.(tsx|ts)$/.test(name) && !name.endsWith('.d.ts')) {
      yield full;
    }
  }
}

// 允许把目标写成单个文件（而非目录）：直接扫描该文件，避免 readdirSync 抛错导致静默 0 命中。
function* targets(rootPath) {
  let st;
  try {
    st = statSync(rootPath);
  } catch {
    return;
  }
  if (st.isFile()) {
    if (/\.(tsx|ts)$/.test(rootPath) && !rootPath.endsWith('.d.ts')) yield rootPath;
  } else {
    yield* walk(rootPath);
  }
}

const findings = [];

for (const file of targets(root)) {
  const src = readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind);
  const lineOf = (idx) => sf.getLineAndCharacterOfPosition(idx).line + 1;

  const record = (node, text, type) => {
    const trimmed = text.trim();
    if (!trimmed || !CJK.test(trimmed)) return;
    findings.push({ file, line: lineOf(node.getStart(sf)), type, text: trimmed });
  };

  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      record(node, node.text, 'literal');
    } else if (ts.isJsxText(node)) {
      record(node, node.text, 'jsx-text');
    } else if (ts.isTemplateExpression(node)) {
      record(node.head, node.head.text, 'template');
      for (const span of node.templateSpans) record(span.literal, span.literal.text, 'template');
    }
    node.forEachChild(visit);
  };
  visit(sf);
}

findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));

if (!quiet) {
  let currentFile = '';
  for (const f of findings) {
    if (f.file !== currentFile) {
      currentFile = f.file;
      process.stdout.write(`\n${currentFile}\n`);
    }
    process.stdout.write(`  ${f.line}: [${f.type}] ${JSON.stringify(f.text)}\n`);
  }
}

const byType = findings.reduce((acc, f) => ((acc[f.type] = (acc[f.type] || 0) + 1), acc), {});
process.stdout.write(
  `\n共 ${findings.length} 处含中文的 UI 字面量/文本` +
    (findings.length ? `（${Object.entries(byType).map(([k, v]) => `${k}:${v}`).join(' · ')}）\n` : '\n')
);

if (failOnFindings && findings.length > 0) process.exit(1);
