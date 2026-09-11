/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { buildBundle, type EntitySnapshot } from '../protocol.js';
import { MemorySyncTransport } from '../transport.js';

const empty: EntitySnapshot = { nodes: [], attrs: [], edges: [] };

describe('SyncTransport 接缝', () => {
  it('push/pull 按书隔离、按时间过滤', async () => {
    const t = new MemorySyncTransport();
    const b1 = buildBundle({ bookId: 'b1', instanceId: 'a', changes: [], entities: empty });
    const b2 = buildBundle({ bookId: 'b2', instanceId: 'a', changes: [], entities: empty });
    await t.push('b1', b1);
    await t.push('b2', b2);

    expect((await t.pull('b1')).map((x) => x.bookId)).toEqual(['b1']);
    expect(await t.pull('b1', Date.now() + 1000)).toEqual([]);
  });
});
