/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 数据层基准（可复现）：用真实引擎跑与仓库同形的表结构，量化三类热路径——
 * 整书重写（现状 saveProject 是全删全插）、全量加载、FTS 检索。
 *
 * 运行：`npm run bench`
 * 规模：BENCH_BOOKS（默认 40）、BENCH_NODES（默认 200）可经环境变量覆盖。
 * 说明：本脚本自带与 `repository/schema.ts` 同形的建表语句，不依赖 TS 源码；
 * 目的不是复刻业务，而是给 B2 性能重构一个稳定、可对比的基线。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3-multiple-ciphers';

const BOOKS = Number(process.env.BENCH_BOOKS ?? 40);
const NODES_PER_BOOK = Number(process.env.BENCH_NODES ?? 200);
const WRITE_ITERATIONS = Number(process.env.BENCH_WRITES ?? 200);
const SEARCH_ITERATIONS = Number(process.env.BENCH_SEARCHES ?? 500);

const nowMs = () => Number(process.hrtime.bigint()) / 1e6;
function timeFn(label, fn) {
  const t0 = nowMs();
  const result = fn();
  const ms = nowMs() - t0;
  console.log(`${label.padEnd(40)} ${ms.toFixed(2).padStart(10)} ms`);
  return { ms, result };
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hongyue-bench-'));
const db = new Database(path.join(dir, 'bench.db'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = FULL');
db.pragma('busy_timeout = 5000');
db.exec(`
  CREATE TABLE nodes(
    id TEXT PRIMARY KEY, book_id TEXT NOT NULL, type TEXT NOT NULL,
    title TEXT NOT NULL, body TEXT NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_nodes_book ON nodes(book_id);
  CREATE TABLE attrs(
    node_id TEXT NOT NULL, name TEXT NOT NULL, value TEXT NOT NULL, position INTEGER NOT NULL
  );
  CREATE INDEX idx_attrs_node ON attrs(node_id);
  CREATE VIRTUAL TABLE nodes_fts USING fts5(title, body, tokenize='trigram');
`);

const insertNode = db.prepare('INSERT INTO nodes(id, book_id, type, title, body, updated_at) VALUES(?,?,?,?,?,?)');
const insertAttr = db.prepare('INSERT INTO attrs(node_id, name, value, position) VALUES(?,?,?,?)');
const insertFts = db.prepare('INSERT INTO nodes_fts(rowid, title, body) VALUES(?,?,?)');

function seedNode(bookIndex, nodeIndex) {
  const id = `b${bookIndex}-n${nodeIndex}`;
  const title = `第 ${nodeIndex + 1} 章：风起云涌`;
  const body = `这是第 ${nodeIndex + 1} 章的正文内容，包含人物、场景与对白，用于模拟真实章节文本长度。`.repeat(4);
  const info = insertNode.run(id, `book-${bookIndex}`, 'chapter', title, body, 1700000000000 + nodeIndex);
  insertAttr.run(id, 'pov', `角色${nodeIndex % 7}`, 0);
  insertAttr.run(id, 'status', nodeIndex % 3 === 0 ? 'draft' : 'done', 1);
  insertFts.run(info.lastInsertRowid, title, body);
  return info.lastInsertRowid;
}

console.log(`\n数据层基准：${BOOKS} 本书 × ${NODES_PER_BOOK} 节点/本\n`);

timeFn('seed（全量灌入）', () => {
  db.exec('BEGIN');
  for (let b = 0; b < BOOKS; b += 1) {
    for (let n = 0; n < NODES_PER_BOOK; n += 1) seedNode(b, n);
  }
  db.exec('COMMIT');
});

// 现状路径：改一章也整书删除 + 重插
const deleteByBook = db.prepare('DELETE FROM nodes WHERE book_id = ?');
const deleteFtsByBook = db.prepare(
  'DELETE FROM nodes_fts WHERE rowid IN (SELECT rowid FROM nodes WHERE book_id = ?)'
);
const deleteAttrsByBook = db.prepare(
  'DELETE FROM attrs WHERE node_id IN (SELECT id FROM nodes WHERE book_id = ?)'
);
const rewriteBook = db.transaction((bookIndex) => {
  const bookId = `book-${bookIndex}`;
  deleteAttrsByBook.run(bookId);
  deleteFtsByBook.run(bookId);
  deleteByBook.run(bookId);
  for (let n = 0; n < NODES_PER_BOOK; n += 1) seedNode(bookIndex, n);
});

timeFn(`整书重写 × ${WRITE_ITERATIONS}（现状 saveProject）`, () => {
  for (let i = 0; i < WRITE_ITERATIONS; i += 1) rewriteBook(i % BOOKS);
});

timeFn('全量加载（SELECT * FROM nodes）', () => {
  const rows = db.prepare('SELECT * FROM nodes').all();
  if (rows.length !== BOOKS * NODES_PER_BOOK) throw new Error('unexpected row count');
  return rows.length;
});

const searchStmt = db.prepare(
  "SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH ? ORDER BY rank LIMIT 20"
);
timeFn(`FTS 检索 × ${SEARCH_ITERATIONS}`, () => {
  let hits = 0;
  for (let i = 0; i < SEARCH_ITERATIONS; i += 1) hits += searchStmt.all('"风起云涌"').length;
  return hits;
});

db.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log('\n完成。对比 B2 改动前后同一命令的输出即可看到提升。\n');
