/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 通用公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */
import { describe, it, expect } from 'vitest';
import { type Project } from '../../../shared/types';
import { suggestNextSection } from '../guidedFlow';

const project = (over: Partial<Project> = {}): Project =>
  ({ id: 'x', title: '书', inspiration: '', intro: '', characters: [], outline: '', chapters: [], knowledge: [], lastModified: 1, ...over } as unknown as Project);

describe('suggestNextSection', () => {
  it('无项目 → inspiration', () => {
    expect(suggestNextSection(null)).toBe('inspiration');
  });
  it('空灵感 → inspiration', () => {
    expect(suggestNextSection(project())).toBe('inspiration');
  });
  it('有灵感无角色 → characters', () => {
    expect(suggestNextSection(project({ inspiration: '赛博朋克' }))).toBe('characters');
  });
  it('仅 intro 也算灵感已填', () => {
    expect(suggestNextSection(project({ intro: '简介' }))).toBe('characters');
  });
  it('有角色无世界 → world', () => {
    expect(suggestNextSection(project({ inspiration: 'x', characters: [{ id: 'c', name: '林渊' } as never] }))).toBe('world');
  });
  it('有知识库跳过世界 → structure', () => {
    expect(
      suggestNextSection(project({ inspiration: 'x', characters: [{ id: 'c' } as never], knowledge: [{ id: 'k' } as never] })),
    ).toBe('structure');
  });
  it('有大纲无章节 → structure', () => {
    expect(suggestNextSection(project({ inspiration: 'x', characters: [{ id: 'c' } as never], outline: '# 大纲', knowledge: [{ id: 'k' } as never] }))).toBe('structure');
  });
  it('全部就绪 → writing', () => {
    expect(suggestNextSection(project({ inspiration: 'x', characters: [{ id: 'c' } as never], outline: 'o', chapters: [{ id: 'ch' } as never], knowledge: [{ id: 'k' } as never] }))).toBe('writing');
  });
  it('空白字符串不算已填', () => {
    expect(suggestNextSection(project({ inspiration: '   ', outline: '  ' }))).toBe('inspiration');
  });
});
