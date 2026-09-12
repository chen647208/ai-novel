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

import type { Character, Project } from '../../../../../shared/types';
import { BirthInfoEditor } from '../BirthInfoEditor';
import { WorldRelationEditor } from '../WorldRelationEditor';

const character = { id: 'c1', name: '甲' } as unknown as Character;
const project = {} as unknown as Project;

describe('CharacterModal 抽出的编辑器', () => {
  it('BirthInfoEditor 折叠态可渲染', () => {
    const html = renderToStaticMarkup(<BirthInfoEditor character={character} onUpdate={vi.fn()} />);
    expect(html).toContain('<button');
  });

  it('WorldRelationEditor 折叠态可渲染', () => {
    const html = renderToStaticMarkup(
      <WorldRelationEditor character={character} project={project} onUpdate={vi.fn()} />,
    );
    expect(html).toContain('<button');
  });
});
