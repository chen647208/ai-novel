/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

import { describe, expect,it } from 'vitest';

import { listRenderers, listTransformers, registerRenderer, registerTransformer, type Renderer, type Transformer } from '../pipeline';

describe('构建贡献点可逆注册', () => {
  it('registerRenderer 解绑后移除', () => {
    const r = { id: 'test-plugin.render', description: 't', render: () => '' } as Renderer;
    const dispose = registerRenderer(r);
    expect(listRenderers().some((x) => x.id === r.id)).toBe(true);
    dispose();
    expect(listRenderers().some((x) => x.id === r.id)).toBe(false);
  });

  it('registerTransformer 解绑后移除', () => {
    const t = { id: 'test-plugin.transform', description: 't', apply: (n) => n } as Transformer;
    const dispose = registerTransformer(t);
    expect(listTransformers().some((x) => x.id === t.id)).toBe(true);
    dispose();
    expect(listTransformers().some((x) => x.id === t.id)).toBe(false);
  });
});
