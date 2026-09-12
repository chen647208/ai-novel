/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import { defaultFromSchema } from '../SchemaForm';

describe('defaultFromSchema', () => {
  it('enum 取首项、嵌套对象递归、基础类型给默认', () => {
    const out = defaultFromSchema({
      type: 'object',
      properties: {
        mode: { enum: ['a', 'b'] },
        nested: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'string' } } },
        flag: { type: 'boolean' },
        name: { type: 'string' },
      },
    });
    expect(out).toEqual({ mode: 'a', nested: { x: 0, y: '' }, flag: false, name: '' });
  });

  it('显式 default 优先于类型默认', () => {
    const out = defaultFromSchema({ type: 'object', properties: { mode: { enum: ['a'], default: 'a' }, n: { type: 'number', default: 5 } } });
    expect(out).toEqual({ mode: 'a', n: 5 });
  });
});
