/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { defaultFromSchema, SchemaForm } from '../SchemaForm';

describe('SchemaForm（§13.2 schema 驱动设置表单）', () => {
  const schema = {
    type: 'object' as const,
    properties: {
      title: { type: 'string' as const, title: '标题' },
      count: { type: 'number' as const, title: '数量' },
      enabled: { type: 'boolean' as const, title: '启用' },
    },
  };

  it('按 schema 渲染文本/数字/布尔控件', () => {
    const html = renderToStaticMarkup(<SchemaForm schema={schema} value={{ title: 'x', count: 3 }} onChange={vi.fn()} />);
    expect(html).toContain('标题');
    expect(html).toContain('type="number"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('value="x"');
  });

  it('defaultFromSchema 生成默认值', () => {
    expect(
      defaultFromSchema({
        properties: {
          a: { type: 'string' },
          b: { type: 'boolean' },
          c: { type: 'integer' },
          d: { default: 5 },
        },
      }),
    ).toEqual({ a: '', b: false, c: 0, d: 5 });
  });

  it('enum 取首项、嵌套对象递归、显式 default 优先', () => {
    expect(
      defaultFromSchema({
        properties: {
          mode: { enum: ['a', 'b'] },
          nested: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'string' } } },
          flag: { type: 'boolean', default: true },
        },
      }),
    ).toEqual({ mode: 'a', nested: { x: 0, y: '' }, flag: true });
  });
});
