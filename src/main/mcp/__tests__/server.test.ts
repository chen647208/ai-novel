/*
 * 本文件属于 红月 (RedMoon) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dispatch } from '../server.js';

let dir = '';
let prevEnv: string | undefined;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ainovel-mcp-'));
  prevEnv = process.env.AINOVEL_DATA_DIR;
  process.env.AINOVEL_DATA_DIR = dir;
});

afterEach(() => {
  if (prevEnv === undefined) delete process.env.AINOVEL_DATA_DIR;
  else process.env.AINOVEL_DATA_DIR = prevEnv;
  fs.rmSync(dir, { recursive: true, force: true });
});

function readProposals(): Array<Record<string, unknown>> {
  const file = path.join(dir, 'ai-sessions', 'pending-proposals.jsonl');
  return fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe('mcp dispatch', () => {
  it('resources/list 宣告单书目录模板', () => {
    const out = dispatch('resources/list', {}) as { resources: Array<{ uri?: string; uriTemplate?: string }> };
    expect(out.resources.some((r) => r.uri === 'books://index')).toBe(true);
    expect(out.resources.some((r) => r.uriTemplate === 'book://{bookId}/toc')).toBe(true);
  });

  it('propose_chapter_write 落盘保留完整执行参数', () => {
    const out = dispatch('tools/call', {
      name: 'propose_chapter_write',
      arguments: { title: '重写第 3 章', nodeId: 'ch3', body: '新正文', bookId: 'book1' },
    }) as { content: Array<{ text: string }> };
    expect(out.content[0]!.text).toContain('待审箱');
    const [line] = readProposals();
    const proposal = line!['proposal'] as { exec: Record<string, unknown>; suggestion: string };
    expect(proposal.exec).toMatchObject({
      kind: 'chapter-write',
      bookId: 'book1',
      nodeId: 'ch3',
      title: '重写第 3 章',
      body: '新正文',
    });
    expect(proposal.suggestion).toBe('新正文');
  });

  it('propose_card_write 落盘保留类型与标题', () => {
    dispatch('tools/call', {
      name: 'propose_card_write',
      arguments: { title: '新反派', type: 'character', body: '背景…', bookId: 'book1' },
    });
    const [line] = readProposals();
    const proposal = line!['proposal'] as { exec: Record<string, unknown> };
    expect(proposal.exec).toMatchObject({ kind: 'card-write', type: 'character', title: '新反派' });
  });

  it('未知方法抛错', () => {
    expect(() => dispatch('nope/method', {})).toThrow('未知方法');
  });
});
