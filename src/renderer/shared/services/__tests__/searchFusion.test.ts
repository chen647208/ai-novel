/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, expect,it } from 'vitest';

import { reciprocalRankFusion } from '../searchFusion';

describe('reciprocalRankFusion', () => {
  it('两路融合：共同命中得分累加居首，且去重', () => {
    const fused = reciprocalRankFusion([[{ k: 'x' }, { k: 'y' }], [{ k: 'y' }, { k: 'z' }]], (i) => i.k);
    expect(fused.map((i) => i.k)[0]).toBe('y');
    expect(fused.map((i) => i.k).sort()).toEqual(['x', 'y', 'z']);
  });

  it('空路不影响结果', () => {
    expect(reciprocalRankFusion([[], [{ k: 'a' }]], (i) => i.k).map((i) => i.k)).toEqual(['a']);
  });
});
